package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.example.di.AppContainer
import com.example.ui.MercatoApp
import com.example.ui.viewmodel.AuthViewModel
import com.example.ui.viewmodel.CartCheckoutViewModel
import com.example.ui.viewmodel.StoreConnectionViewModel
import com.example.ui.viewmodel.StorefrontViewModel

class MainActivity : ComponentActivity() {

    private val appContainer by lazy { AppContainer(applicationContext) }

    private val connectionViewModel: StoreConnectionViewModel by viewModels {
        StoreConnectionViewModel.Factory(appContainer.storeRepository)
    }

    private val storefrontViewModel: StorefrontViewModel by viewModels {
        StorefrontViewModel.Factory(
            appContainer.storeRepository,
            appContainer.catalogRepository
        )
    }

    private val cartViewModel: CartCheckoutViewModel by viewModels {
        CartCheckoutViewModel.Factory(
            appContainer.storeRepository,
            appContainer.cartRepository,
            appContainer.authRepository
        )
    }

    private val authViewModel: AuthViewModel by viewModels {
        AuthViewModel.Factory(
            appContainer.storeRepository,
            appContainer.authRepository
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MercatoApp(
                connectionViewModel = connectionViewModel,
                storefrontViewModel = storefrontViewModel,
                cartViewModel = cartViewModel,
                authViewModel = authViewModel
            )
        }
    }
}
