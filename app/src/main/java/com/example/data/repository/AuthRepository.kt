package com.example.data.repository

import com.example.data.local.StorePreferences
import com.example.data.model.CustomerAddress
import com.example.data.model.CustomerSession
import com.example.data.model.StoreConfig
import com.example.data.model.WooBillingAddress
import com.example.data.model.WooCustomer
import com.example.data.model.WooCustomerCreateRequest
import com.example.data.model.WooCustomerUpdateRequest
import com.example.data.model.WooShippingAddress
import com.example.data.model.WpJwtTokenRequest
import com.example.data.remote.WooCommerceClient
import kotlinx.coroutines.flow.Flow
import okhttp3.Credentials
import retrofit2.HttpException

class AuthRepository(
    private val preferences: StorePreferences
) {
    val activeCustomer: Flow<CustomerSession?> = preferences.activeCustomerSessionFlow

    /**
     * Authenticates an existing WordPress + WooCommerce user:
     * 1. Attempts WordPress JWT Auth (`POST /wp-json/jwt-auth/v1/token`).
     * 2. If JWT endpoint is absent (404), falls back to WordPress Basic/Application Password auth (`GET /wp-json/wp/v2/users/me`).
     * 3. Hydrates full WooCommerce Customer profile (`GET /wp-json/wc/v3/customers`).
     */
    suspend fun loginCustomer(
        config: StoreConfig,
        usernameOrEmail: String,
        password: String
    ): Result<CustomerSession> {
        val identifier = usernameOrEmail.trim()
        if (identifier.isBlank() || password.isEmpty()) {
            return Result.failure(IllegalArgumentException("Enter both your email/username and password."))
        }

        val wpAuthApi = WooCommerceClient.createWordPressAuthApi(config.storeUrl)
        val wooApi = WooCommerceClient.createApi(config)

        return try {
            var verifiedEmail: String? = null
            var verifiedId: Long? = null
            var jwtToken = ""

            // Step 1: Try JWT Auth plugin endpoint
            val jwtResult = runCatching {
                wpAuthApi.loginWithJwt(WpJwtTokenRequest(username = identifier, password = password))
            }

            if (jwtResult.isSuccess) {
                val jwt = jwtResult.getOrNull()
                if (!jwt?.token.isNullOrBlank()) {
                    jwtToken = jwt?.token.orEmpty()
                    verifiedEmail = jwt?.userEmail
                    val me = runCatching { wpAuthApi.getMeWithAuth("Bearer $jwtToken") }.getOrNull()
                    verifiedId = me?.id?.takeIf { it > 0 }
                }
            } else {
                val jwtErr = jwtResult.exceptionOrNull()
                if (jwtErr is HttpException && jwtErr.code() in listOf(401, 403)) {
                    return Result.failure(Exception(WooCommerceClient.formatNetworkError(jwtErr)))
                }

                // Step 2: Fallback to WP REST /users/me with Application Password / Basic Auth
                val basicHeader = Credentials.basic(identifier, password)
                val meResult = runCatching { wpAuthApi.getMeWithAuth(basicHeader) }
                if (meResult.isSuccess) {
                    val me = meResult.getOrThrow()
                    verifiedId = me.id.takeIf { it > 0 }
                    verifiedEmail = me.email ?: identifier.takeIf { it.contains('@') }
                } else {
                    val meErr = meResult.exceptionOrNull()
                    if (meErr is HttpException && meErr.code() == 404) {
                        return Result.failure(
                            Exception(
                                "WordPress login requires the 'JWT Authentication for WP REST API' plugin or WordPress Application Passwords enabled on ${config.storeName}."
                            )
                        )
                    }
                    return Result.failure(
                        Exception(
                            meErr?.let { WooCommerceClient.formatNetworkError(it) }
                                ?: "Invalid username or password."
                        )
                    )
                }
            }

            // Step 3: Hydrate WooCommerce customer profile
            val customer = hydrateWooCustomer(wooApi, verifiedId, verifiedEmail, identifier)
                ?: return Result.failure(
                    Exception("WordPress account verified, but no matching WooCommerce customer record was found.")
                )

            val session = customer.toSession(storeUrl = config.storeUrl, jwtToken = jwtToken)
            preferences.saveCustomerSession(session)
            Result.success(session)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    /**
     * Registers a brand-new WordPress user & WooCommerce customer via POST /wp-json/wc/v3/customers.
     */
    suspend fun registerCustomer(
        config: StoreConfig,
        firstName: String,
        lastName: String,
        email: String,
        username: String,
        password: String
    ): Result<CustomerSession> {
        val cleanEmail = email.trim()
        val cleanFirst = firstName.trim()
        val cleanLast = lastName.trim()
        val cleanUsername = username.trim().ifBlank {
            cleanEmail.substringBefore("@").replace(Regex("[^a-zA-Z0-9._-]"), "")
        }

        if (cleanFirst.isBlank() || cleanEmail.isBlank() || !cleanEmail.contains('@')) {
            return Result.failure(IllegalArgumentException("Enter your first name and a valid email address."))
        }
        if (password.length < 6) {
            return Result.failure(IllegalArgumentException("Password must be at least 6 characters."))
        }

        return try {
            val wooApi = WooCommerceClient.createApi(config)
            val created = wooApi.createCustomer(
                WooCustomerCreateRequest(
                    email = cleanEmail,
                    firstName = cleanFirst,
                    lastName = cleanLast,
                    username = cleanUsername,
                    password = password
                )
            )
            // Optionally attempt JWT token retrieval silently if plugin is installed
            val jwt = runCatching {
                WooCommerceClient.createWordPressAuthApi(config.storeUrl)
                    .loginWithJwt(WpJwtTokenRequest(username = cleanEmail, password = password))
                    .token.orEmpty()
            }.getOrDefault("")

            val session = created.toSession(storeUrl = config.storeUrl, jwtToken = jwt)
            preferences.saveCustomerSession(session)
            Result.success(session)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    /**
     * Syncs the logged-in customer's profile & billing/shipping address back to WooCommerce.
     */
    suspend fun updateCustomerProfile(
        config: StoreConfig,
        session: CustomerSession,
        firstName: String,
        lastName: String,
        address: CustomerAddress
    ): Result<CustomerSession> {
        return try {
            val wooApi = WooCommerceClient.createApi(config)
            val cleanFirst = firstName.trim()
            val cleanLast = lastName.trim()
            val updatedCustomer = wooApi.updateCustomer(
                customerId = session.customerId,
                request = WooCustomerUpdateRequest(
                    firstName = cleanFirst,
                    lastName = cleanLast,
                    billing = WooBillingAddress(
                        firstName = cleanFirst,
                        lastName = cleanLast,
                        address1 = address.address1.trim(),
                        city = address.city.trim(),
                        state = address.state.trim(),
                        postcode = address.postcode.trim(),
                        country = address.country.trim().ifBlank { "US" }.uppercase(),
                        email = session.email,
                        phone = address.phone.trim()
                    ),
                    shipping = WooShippingAddress(
                        firstName = cleanFirst,
                        lastName = cleanLast,
                        address1 = address.address1.trim(),
                        city = address.city.trim(),
                        state = address.state.trim(),
                        postcode = address.postcode.trim(),
                        country = address.country.trim().ifBlank { "US" }.uppercase()
                    )
                )
            )
            val updatedSession = updatedCustomer.toSession(config.storeUrl, session.jwtToken)
            preferences.saveCustomerSession(updatedSession)
            Result.success(updatedSession)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun refreshCustomerProfile(config: StoreConfig, session: CustomerSession): Result<CustomerSession> {
        return try {
            val wooApi = WooCommerceClient.createApi(config)
            val fresh = wooApi.getCustomerById(session.customerId)
            val updated = fresh.toSession(config.storeUrl, session.jwtToken)
            preferences.saveCustomerSession(updated)
            Result.success(updated)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun logout(storeUrl: String) {
        preferences.clearCustomerSession(storeUrl)
    }

    private suspend fun hydrateWooCustomer(
        wooApi: com.example.data.remote.WooCommerceApi,
        verifiedId: Long?,
        verifiedEmail: String?,
        identifier: String
    ): WooCustomer? {
        if (verifiedId != null) {
            runCatching { wooApi.getCustomerById(verifiedId) }.getOrNull()?.let { return it }
        }
        val emailLookup = verifiedEmail ?: identifier.takeIf { it.contains('@') }
        if (!emailLookup.isNullOrBlank()) {
            runCatching { wooApi.getCustomers(email = emailLookup) }.getOrNull()
                ?.firstOrNull()?.let { return it }
        }
        return runCatching { wooApi.getCustomers(search = identifier) }.getOrNull()
            ?.firstOrNull {
                it.username.equals(identifier, ignoreCase = true) ||
                    it.email.equals(identifier, ignoreCase = true)
            }
    }

    private fun WooCustomer.toSession(storeUrl: String, jwtToken: String): CustomerSession {
        val b = billing
        val s = shipping
        return CustomerSession(
            storeUrl = storeUrl,
            customerId = id,
            email = email,
            username = username,
            firstName = firstName.ifBlank { b?.firstName.orEmpty() },
            lastName = lastName.ifBlank { b?.lastName.orEmpty() },
            avatarUrl = avatarUrl,
            jwtToken = jwtToken,
            billing = CustomerAddress(
                firstName = b?.firstName.orEmpty().ifBlank { s?.firstName.orEmpty() },
                lastName = b?.lastName.orEmpty().ifBlank { s?.lastName.orEmpty() },
                address1 = b?.address1.orEmpty().ifBlank { s?.address1.orEmpty() },
                city = b?.city.orEmpty().ifBlank { s?.city.orEmpty() },
                state = b?.state.orEmpty().ifBlank { s?.state.orEmpty() },
                postcode = b?.postcode.orEmpty().ifBlank { s?.postcode.orEmpty() },
                country = b?.country.orEmpty().ifBlank { s?.country.orEmpty() }.ifBlank { "US" },
                phone = b?.phone.orEmpty()
            )
        )
    }
}
