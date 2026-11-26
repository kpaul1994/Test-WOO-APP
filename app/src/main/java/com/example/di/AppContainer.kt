package com.example.di

import android.content.Context
import com.example.data.local.AppDatabase
import com.example.data.local.StorePreferences
import com.example.data.repository.CartRepository
import com.example.data.repository.CatalogRepository
import com.example.data.repository.StoreRepository

class AppContainer(context: Context) {
    private val appContext = context.applicationContext
    private val database by lazy { AppDatabase.getInstance(appContext) }
    private val storePreferences by lazy { StorePreferences(appContext) }

    val storeRepository by lazy { StoreRepository(storePreferences) }
    val catalogRepository by lazy { CatalogRepository() }
    val cartRepository by lazy {
        CartRepository(
            cartDao = database.cartDao(),
            wishlistDao = database.wishlistDao(),
            storeRepository = storeRepository
        )
    }
}
