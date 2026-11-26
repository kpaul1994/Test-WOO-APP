package com.example.ui.navigation

import kotlinx.serialization.Serializable

@Serializable
object ConnectStoreRoute

@Serializable
object HomeRoute

@Serializable
data class ExploreRoute(
    val categoryId: Long? = null,
    val categoryName: String? = null,
    val onSaleOnly: Boolean = false
)

@Serializable
object WishlistRoute

@Serializable
object CartRoute

@Serializable
object OrdersAndStoreRoute

@Serializable
data class ProductDetailRoute(
    val productId: Long
)

@Serializable
object CheckoutRoute
