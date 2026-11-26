package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.StoreConfig
import com.example.data.repository.StoreRepository
import com.example.ui.theme.ThemeMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface ConnectionUiState {
    data object Idle : ConnectionUiState
    data object Connecting : ConnectionUiState
    data class Connected(val config: StoreConfig) : ConnectionUiState
    data class Error(val message: String) : ConnectionUiState
}

data class ConnectFormState(
    val storeUrl: String = "",
    val consumerKey: String = "",
    val consumerSecret: String = "",
    val customStoreName: String = "",
    val connectionState: ConnectionUiState = ConnectionUiState.Idle
)

sealed interface ActiveStoreState {
    data object Loading : ActiveStoreState
    data object Disconnected : ActiveStoreState
    data class Connected(val config: StoreConfig) : ActiveStoreState
}

class StoreConnectionViewModel(
    private val storeRepository: StoreRepository
) : ViewModel() {

    val storeState: StateFlow<ActiveStoreState> = storeRepository.activeStore
        .let { flow ->
            kotlinx.coroutines.flow.flow {
                flow.collect { config ->
                    emit(
                        if (config == null) ActiveStoreState.Disconnected
                        else ActiveStoreState.Connected(config)
                    )
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.Eagerly, ActiveStoreState.Loading)

    val activeStore: StateFlow<StoreConfig?> = storeRepository.activeStore
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val savedStores: StateFlow<List<StoreConfig>> = storeRepository.savedStores
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val themeMode: StateFlow<ThemeMode> = storeRepository.themeMode
        .stateIn(viewModelScope, SharingStarted.Eagerly, ThemeMode.SYSTEM)

    private val _formState = MutableStateFlow(ConnectFormState())
    val formState: StateFlow<ConnectFormState> = _formState.asStateFlow()

    fun onStoreUrlChange(value: String) {
        _formState.update { it.copy(storeUrl = value, connectionState = ConnectionUiState.Idle) }
    }

    fun onConsumerKeyChange(value: String) {
        _formState.update { it.copy(consumerKey = value, connectionState = ConnectionUiState.Idle) }
    }

    fun onConsumerSecretChange(value: String) {
        _formState.update { it.copy(consumerSecret = value, connectionState = ConnectionUiState.Idle) }
    }

    fun onCustomNameChange(value: String) {
        _formState.update { it.copy(customStoreName = value) }
    }

    fun prefillForEdit(config: StoreConfig) {
        _formState.value = ConnectFormState(
            storeUrl = config.storeUrl,
            consumerKey = config.consumerKey,
            consumerSecret = config.consumerSecret,
            customStoreName = config.storeName,
            connectionState = ConnectionUiState.Idle
        )
    }

    fun clearForm() {
        _formState.value = ConnectFormState()
    }

    fun connectStore(onConnected: () -> Unit = {}) {
        val current = _formState.value
        if (current.connectionState is ConnectionUiState.Connecting) return

        viewModelScope.launch {
            _formState.update { it.copy(connectionState = ConnectionUiState.Connecting) }
            val result = storeRepository.testAndConnectStore(
                rawUrl = current.storeUrl,
                consumerKey = current.consumerKey,
                consumerSecret = current.consumerSecret,
                customStoreName = current.customStoreName
            )
            result.fold(
                onSuccess = { config ->
                    _formState.update {
                        it.copy(
                            storeUrl = config.storeUrl,
                            customStoreName = config.storeName,
                            connectionState = ConnectionUiState.Connected(config)
                        )
                    }
                    onConnected()
                },
                onFailure = { error ->
                    _formState.update {
                        it.copy(
                            connectionState = ConnectionUiState.Error(
                                error.message ?: "Unable to connect to store."
                            )
                        )
                    }
                }
            )
        }
    }

    fun switchStore(storeUrl: String, onSwitched: () -> Unit = {}) {
        viewModelScope.launch {
            storeRepository.switchStore(storeUrl)
            onSwitched()
        }
    }

    fun refreshActiveStoreInfo() {
        val current = activeStore.value ?: return
        viewModelScope.launch {
            storeRepository.testAndConnectStore(
                rawUrl = current.storeUrl,
                consumerKey = current.consumerKey,
                consumerSecret = current.consumerSecret,
                customStoreName = current.storeName
            )
        }
    }

    fun disconnectStore() {
        viewModelScope.launch {
            storeRepository.disconnectActiveStore()
        }
    }

    fun removeSavedStore(storeUrl: String) {
        viewModelScope.launch {
            storeRepository.removeSavedStore(storeUrl)
        }
    }

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch {
            storeRepository.setThemeMode(mode)
        }
    }

    class Factory(private val repository: StoreRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return StoreConnectionViewModel(repository) as T
        }
    }
}
