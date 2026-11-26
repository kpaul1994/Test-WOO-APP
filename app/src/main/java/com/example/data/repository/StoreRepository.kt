package com.example.data.repository

import com.example.data.local.StorePreferences
import com.example.data.model.StoreConfig
import com.example.data.remote.WooCommerceClient
import com.example.ui.theme.ThemeMode
import com.example.util.HtmlTextParser
import com.example.util.UrlValidationResult
import com.example.util.UrlValidator
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow

class StoreRepository(
    private val preferences: StorePreferences
) {
    val activeStore: Flow<StoreConfig?> = preferences.activeStoreFlow
    val savedStores: Flow<List<StoreConfig>> = preferences.savedStoresFlow
    val themeMode: Flow<ThemeMode> = preferences.themeModeFlow
    val hideDemoControls: Flow<Boolean> = preferences.hideDemoControlsFlow
    val recentOrderIds: Flow<Map<String, List<Long>>> = preferences.recentOrderIdsFlow

    suspend fun testAndConnectStore(
        rawUrl: String,
        consumerKey: String,
        consumerSecret: String,
        customStoreName: String
    ): Result<StoreConfig> {
        val urlCheck = UrlValidator.validateAndNormalize(rawUrl)
        if (urlCheck is UrlValidationResult.Invalid) {
            return Result.failure(IllegalArgumentException(urlCheck.reason))
        }
        val validUrl = (urlCheck as UrlValidationResult.Valid)
        val cleanKey = consumerKey.trim()
        val cleanSecret = consumerSecret.trim()

        if (cleanKey.isBlank() || cleanSecret.isBlank()) {
            return Result.failure(IllegalArgumentException("Both Consumer Key and Consumer Secret are required."))
        }

        val probeConfig = StoreConfig(
            storeUrl = validUrl.normalizedBaseUrl,
            storeName = customStoreName.trim().ifBlank { validUrl.host },
            consumerKey = cleanKey,
            consumerSecret = cleanSecret
        )

        return try {
            val api = WooCommerceClient.createApi(probeConfig)
            coroutineScope {
                // Verify WooCommerce API access by fetching products (1 item)
                val productsDeferred = async { api.getProducts(page = 1, perPage = 1) }
                // Optionally fetch currency and WordPress store title
                val currencyDeferred = async { runCatching { api.getCurrentCurrency() }.getOrNull() }
                val wpRootDeferred = async { runCatching { api.getWordPressRoot() }.getOrNull() }

                productsDeferred.await()
                val currency = currencyDeferred.await()
                val wpRoot = wpRootDeferred.await()

                val detectedTitle = HtmlTextParser.decodeEntities(wpRoot?.name).ifBlank { validUrl.host }
                val finalName = customStoreName.trim().ifBlank { detectedTitle }
                val finalConfig = probeConfig.copy(
                    storeName = finalName,
                    currencySymbol = HtmlTextParser.decodeEntities(currency?.symbol).ifBlank { "$" },
                    currencyCode = currency?.code?.ifBlank { "USD" } ?: "USD",
                    tagline = HtmlTextParser.decodeEntities(wpRoot?.description),
                    lastSyncedAt = System.currentTimeMillis()
                )
                preferences.saveAndActivateStore(finalConfig)
                Result.success(finalConfig)
            }
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun switchStore(storeUrl: String) {
        preferences.switchActiveStore(storeUrl)
    }

    suspend fun disconnectActiveStore() {
        preferences.disconnectActiveStore()
    }

    suspend fun removeSavedStore(storeUrl: String) {
        preferences.removeSavedStore(storeUrl)
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        preferences.setThemeMode(mode)
    }

    suspend fun setHideDemoControls(hide: Boolean) {
        preferences.setHideDemoControls(hide)
    }

    suspend fun recordPlacedOrder(storeUrl: String, orderId: Long) {
        preferences.recordPlacedOrder(storeUrl, orderId)
    }
}
