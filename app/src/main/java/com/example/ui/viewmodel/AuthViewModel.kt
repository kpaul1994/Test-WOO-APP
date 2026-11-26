package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.CustomerAddress
import com.example.data.model.CustomerSession
import com.example.data.repository.AuthRepository
import com.example.data.repository.StoreRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface AuthActionState {
    data object Idle : AuthActionState
    data object Loading : AuthActionState
    data class Success(val message: String) : AuthActionState
    data class Error(val message: String) : AuthActionState
}

data class AuthFormState(
    val isRegisterMode: Boolean = false,
    val identifier: String = "",
    val password: String = "",
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val username: String = "",
    val actionState: AuthActionState = AuthActionState.Idle
)

class AuthViewModel(
    private val storeRepository: StoreRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val activeCustomer: StateFlow<CustomerSession?> = authRepository.activeCustomer
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _formState = MutableStateFlow(AuthFormState())
    val formState: StateFlow<AuthFormState> = _formState.asStateFlow()

    fun toggleAuthMode(isRegister: Boolean) {
        _formState.update { it.copy(isRegisterMode = isRegister, actionState = AuthActionState.Idle) }
    }

    fun updateForm(transform: (AuthFormState) -> AuthFormState) {
        _formState.update { transform(it).copy(actionState = AuthActionState.Idle) }
    }

    fun clearStatus() {
        _formState.update { it.copy(actionState = AuthActionState.Idle) }
    }

    fun submitLogin(onSuccess: () -> Unit = {}) {
        val store = viewModelScope.let { null } // resolved cleanly inside coroutine
        val form = _formState.value
        if (form.actionState is AuthActionState.Loading) return

        viewModelScope.launch {
            val activeStore = storeRepository.activeStore.first() ?: return@launch
            _formState.update { it.copy(actionState = AuthActionState.Loading) }
            authRepository.loginCustomer(
                config = activeStore,
                usernameOrEmail = form.identifier,
                password = form.password
            ).fold(
                onSuccess = { session ->
                    _formState.value = AuthFormState(
                        actionState = AuthActionState.Success("Welcome back, ${session.fullName}")
                    )
                    onSuccess()
                },
                onFailure = { err ->
                    _formState.update {
                        it.copy(
                            actionState = AuthActionState.Error(
                                err.message ?: "Unable to sign in."
                            )
                        )
                    }
                }
            )
        }
    }

    fun submitRegistration(onSuccess: () -> Unit = {}) {
        val form = _formState.value
        if (form.actionState is AuthActionState.Loading) return

        viewModelScope.launch {
            val activeStore = storeRepository.activeStore.first() ?: return@launch
            _formState.update { it.copy(actionState = AuthActionState.Loading) }
            authRepository.registerCustomer(
                config = activeStore,
                firstName = form.firstName,
                lastName = form.lastName,
                email = form.email,
                username = form.username,
                password = form.password
            ).fold(
                onSuccess = { session ->
                    _formState.value = AuthFormState(
                        actionState = AuthActionState.Success("Account created for ${session.email}")
                    )
                    onSuccess()
                },
                onFailure = { err ->
                    _formState.update {
                        it.copy(
                            actionState = AuthActionState.Error(
                                err.message ?: "Unable to create account."
                            )
                        )
                    }
                }
            )
        }
    }

    fun updateProfile(
        firstName: String,
        lastName: String,
        address: CustomerAddress,
        onComplete: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val store = storeRepository.activeStore.first() ?: return@launch
            val session = activeCustomer.value ?: return@launch
            authRepository.updateCustomerProfile(store, session, firstName, lastName, address).fold(
                onSuccess = { onComplete(true, "Profile & address synced to WooCommerce") },
                onFailure = { err -> onComplete(false, err.message ?: "Update failed.") }
            )
        }
    }

    fun refreshProfile() {
        viewModelScope.launch {
            val store = storeRepository.activeStore.first() ?: return@launch
            val session = activeCustomer.value ?: return@launch
            authRepository.refreshCustomerProfile(store, session)
        }
    }

    fun logout() {
        viewModelScope.launch {
            val store = storeRepository.activeStore.first() ?: return@launch
            authRepository.logout(store.storeUrl)
            _formState.value = AuthFormState()
        }
    }

    class Factory(
        private val storeRepository: StoreRepository,
        private val authRepository: AuthRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return AuthViewModel(storeRepository, authRepository) as T
        }
    }
}
