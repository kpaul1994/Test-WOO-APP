package com.example.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "cart_items",
    indices = [Index(value = ["storeUrl", "productId", "variationId"], unique = true)]
)
data class CartItemEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val storeUrl: String,
    val productId: Long,
    val variationId: Long? = null,
    val name: String,
    val imageUrl: String,
    val price: Double,
    val regularPrice: Double? = null,
    val variantSummary: String = "",
    val sku: String = "",
    val quantity: Int = 1,
    val addedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "wishlist_items",
    primaryKeys = ["storeUrl", "productId"]
)
data class WishlistItemEntity(
    val storeUrl: String,
    val productId: Long,
    val name: String,
    val imageUrl: String,
    val price: Double,
    val regularPrice: Double? = null,
    val onSale: Boolean = false,
    val averageRating: String = "0.00",
    val categoryName: String = "",
    val addedAt: Long = System.currentTimeMillis()
)
