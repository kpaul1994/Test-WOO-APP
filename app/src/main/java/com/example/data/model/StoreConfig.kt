package com.example.data.model

import kotlinx.serialization.Serializable

@Serializable
data class StoreConfig(
    val storeUrl: String,
    val storeName: String,
    val consumerKey: String,
    val consumerSecret: String,
    val currencySymbol: String = "$",
    val currencyCode: String = "USD",
    val tagline: String = "",
    val lastSyncedAt: Long = System.currentTimeMillis()
) {
    val isValid: Boolean
        get() = storeUrl.isNotBlank() && consumerKey.isNotBlank() && consumerSecret.isNotBlank()
}
