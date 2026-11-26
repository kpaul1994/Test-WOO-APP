package com.example.data.repository

import com.example.data.local.CartDao
import com.example.data.local.CartItemEntity
import com.example.data.local.WishlistDao
import com.example.data.local.WishlistItemEntity
import com.example.data.model.StoreConfig
import com.example.data.model.WooBillingAddress
import com.example.data.model.WooCoupon
import com.example.data.model.WooOrderCouponLineRequest
import com.example.data.model.WooOrderCreateRequest
import com.example.data.model.WooOrderLineItemRequest
import com.example.data.model.WooOrderResponse
import com.example.data.model.WooPaymentGateway
import com.example.data.model.WooProduct
import com.example.data.model.WooProductVariation
import com.example.data.model.WooShippingAddress
import com.example.data.remote.WooCommerceClient
import com.example.util.HtmlTextParser
import kotlinx.coroutines.flow.Flow

class CartRepository(
    private val cartDao: CartDao,
    private val wishlistDao: WishlistDao,
    private val storeRepository: StoreRepository
) {
    fun observeCart(storeUrl: String): Flow<List<CartItemEntity>> = cartDao.observeCart(storeUrl)

    fun observeWishlist(storeUrl: String): Flow<List<WishlistItemEntity>> = wishlistDao.observeWishlist(storeUrl)

    fun observeWishlistIds(storeUrl: String): Flow<List<Long>> = wishlistDao.observeWishlistIds(storeUrl)

    suspend fun addToCart(
        storeUrl: String,
        product: WooProduct,
        variation: WooProductVariation? = null,
        quantity: Int = 1
    ) {
        val variationId = variation?.id
        val existing = cartDao.findCartItem(storeUrl, product.id, variationId)
        if (existing != null) {
            cartDao.updateQuantity(existing.localId, (existing.quantity + quantity).coerceAtMost(99))
            return
        }

        val rawPrice = variation?.price?.takeIf { it.isNotBlank() } ?: product.price
        val rawRegular = variation?.regularPrice?.takeIf { it.isNotBlank() } ?: product.regularPrice
        val priceVal = rawPrice.toDoubleOrNull() ?: rawRegular.toDoubleOrNull() ?: 0.0
        val regularVal = rawRegular.toDoubleOrNull()
        val variantSummary = variation?.attributes
            ?.filter { it.option.isNotBlank() }
            ?.joinToString(" • ") { "${it.name}: ${it.option}" }
            ?: ""
        val imageUrl = variation?.image?.src?.takeIf { it.isNotBlank() }
            ?: product.images.firstOrNull()?.src.orEmpty()
        val sku = variation?.sku?.takeIf { it.isNotBlank() } ?: product.sku

        cartDao.insert(
            CartItemEntity(
                storeUrl = storeUrl,
                productId = product.id,
                variationId = variationId,
                name = HtmlTextParser.decodeEntities(product.name),
                imageUrl = imageUrl,
                price = priceVal,
                regularPrice = regularVal,
                variantSummary = variantSummary,
                sku = sku,
                quantity = quantity.coerceIn(1, 99)
            )
        )
    }

    suspend fun updateCartQuantity(localId: Long, quantity: Int) {
        if (quantity <= 0) {
            cartDao.deleteById(localId)
        } else {
            cartDao.updateQuantity(localId, quantity.coerceAtMost(99))
        }
    }

    suspend fun removeCartItem(localId: Long) {
        cartDao.deleteById(localId)
    }

    suspend fun toggleWishlist(storeUrl: String, product: WooProduct) {
        val exists = wishlistDao.isWishlisted(storeUrl, product.id)
        if (exists) {
            wishlistDao.delete(storeUrl, product.id)
        } else {
            val priceVal = product.price.toDoubleOrNull()
                ?: product.regularPrice.toDoubleOrNull()
                ?: 0.0
            wishlistDao.insert(
                WishlistItemEntity(
                    storeUrl = storeUrl,
                    productId = product.id,
                    name = HtmlTextParser.decodeEntities(product.name),
                    imageUrl = product.images.firstOrNull()?.src.orEmpty(),
                    price = priceVal,
                    regularPrice = product.regularPrice.toDoubleOrNull(),
                    onSale = product.onSale,
                    averageRating = product.averageRating,
                    categoryName = HtmlTextParser.decodeEntities(product.categories.firstOrNull()?.name)
                )
            )
        }
    }

    suspend fun removeFromWishlist(storeUrl: String, productId: Long) {
        wishlistDao.delete(storeUrl, productId)
    }

    suspend fun validateCoupon(config: StoreConfig, code: String, subtotal: Double): Result<WooCoupon> {
        val trimmed = code.trim()
        if (trimmed.isBlank()) {
            return Result.failure(IllegalArgumentException("Enter a coupon code."))
        }
        return try {
            val api = WooCommerceClient.createApi(config)
            val coupons = api.findCouponByCode(trimmed)
            val matched = coupons.firstOrNull { it.code.equals(trimmed, ignoreCase = true) }
                ?: return Result.failure(IllegalArgumentException("Coupon \"$trimmed\" was not found."))

            val minAmount = matched.minimumAmount.toDoubleOrNull() ?: 0.0
            if (minAmount > 0 && subtotal < minAmount) {
                return Result.failure(
                    IllegalArgumentException("Minimum spend of ${config.currencySymbol}$minAmount required.")
                )
            }
            Result.success(matched)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun fetchEnabledPaymentGateways(config: StoreConfig): Result<List<WooPaymentGateway>> {
        return try {
            val api = WooCommerceClient.createApi(config)
            val enabled = api.getPaymentGateways()
                .filter { it.enabled }
                .sortedBy { it.order }
            Result.success(enabled)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun submitOrder(
        config: StoreConfig,
        items: List<CartItemEntity>,
        billing: WooBillingAddress,
        paymentGateway: WooPaymentGateway,
        couponCode: String?,
        customerNote: String
    ): Result<WooOrderResponse> {
        if (items.isEmpty()) {
            return Result.failure(IllegalArgumentException("Your shopping bag is empty."))
        }
        return try {
            val api = WooCommerceClient.createApi(config)
            val shipping = WooShippingAddress(
                firstName = billing.firstName,
                lastName = billing.lastName,
                address1 = billing.address1,
                address2 = billing.address2,
                city = billing.city,
                state = billing.state,
                postcode = billing.postcode,
                country = billing.country
            )
            val request = WooOrderCreateRequest(
                paymentMethod = paymentGateway.id,
                paymentMethodTitle = HtmlTextParser.decodeEntities(paymentGateway.title).ifBlank { paymentGateway.id },
                setPaid = false,
                billing = billing,
                shipping = shipping,
                lineItems = items.map {
                    WooOrderLineItemRequest(
                        productId = it.productId,
                        variationId = it.variationId,
                        quantity = it.quantity
                    )
                },
                couponLines = if (!couponCode.isNullOrBlank()) {
                    listOf(WooOrderCouponLineRequest(couponCode.trim()))
                } else {
                    emptyList()
                },
                customerNote = customerNote.trim()
            )
            val order = api.createOrder(request)
            cartDao.clearStoreCart(config.storeUrl)
            storeRepository.recordPlacedOrder(config.storeUrl, order.id)
            Result.success(order)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun fetchOrders(config: StoreConfig, orderIds: List<Long>): Result<List<WooOrderResponse>> {
        return try {
            val api = WooCommerceClient.createApi(config)
            val includeParam = orderIds.takeIf { it.isNotEmpty() }?.joinToString(",")
            val orders = api.getOrders(page = 1, perPage = 20, includeIds = includeParam)
            Result.success(orders)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun lookupOrderById(config: StoreConfig, orderId: Long): Result<WooOrderResponse> {
        return try {
            val api = WooCommerceClient.createApi(config)
            val order = api.getOrderById(orderId)
            storeRepository.recordPlacedOrder(config.storeUrl, order.id)
            Result.success(order)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    fun calculateDiscount(subtotal: Double, coupon: WooCoupon?): Double {
        if (coupon == null || subtotal <= 0.0) return 0.0
        val amount = coupon.amount.toDoubleOrNull() ?: return 0.0
        return when (coupon.discountType) {
            "percent" -> (subtotal * (amount / 100.0)).coerceAtMost(subtotal)
            else -> amount.coerceAtMost(subtotal)
        }
    }
}
