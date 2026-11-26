package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.local.CartItemEntity
import com.example.data.local.WishlistItemEntity
import com.example.data.model.StoreConfig
import com.example.data.model.WooBillingAddress
import com.example.data.model.WooCoupon
import com.example.data.model.WooOrderResponse
import com.example.data.model.WooPaymentGateway
import com.example.data.model.WooProduct
import com.example.data.model.WooProductVariation
import com.example.data.repository.CartRepository
import com.example.data.repository.StoreRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CartCouponState(
    val couponCodeInput: String = "",
    val appliedCoupon: WooCoupon? = null,
    val isValidating: Boolean = false,
    val errorMessage: String? = null
)

sealed interface CheckoutUiState {
    data object Idle : CheckoutUiState
    data object Submitting : CheckoutUiState
    data class OrderPlaced(val order: WooOrderResponse) : CheckoutUiState
    data class Error(val message: String) : CheckoutUiState
}

data class CheckoutFormState(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val phone: String = "",
    val address1: String = "",
    val city: String = "",
    val state: String = "",
    val postcode: String = "",
    val country: String = "US",
    val customerNote: String = "",
    val gateways: List<WooPaymentGateway> = emptyList(),
    val isLoadingGateways: Boolean = false,
    val selectedGatewayId: String? = null,
    val submitState: CheckoutUiState = CheckoutUiState.Idle
)

sealed interface OrdersUiState {
    data object Loading : OrdersUiState
    data class Success(val orders: List<WooOrderResponse>) : OrdersUiState
    data class Error(val message: String) : OrdersUiState
}

@OptIn(ExperimentalCoroutinesApi::class)
class CartCheckoutViewModel(
    private val storeRepository: StoreRepository,
    private val cartRepository: CartRepository
) : ViewModel() {

    private val activeStore = storeRepository.activeStore
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val cartItems: StateFlow<List<CartItemEntity>> = storeRepository.activeStore
        .flatMapLatest { config ->
            if (config == null) flowOf(emptyList()) else cartRepository.observeCart(config.storeUrl)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val wishlistItems: StateFlow<List<WishlistItemEntity>> = storeRepository.activeStore
        .flatMapLatest { config ->
            if (config == null) flowOf(emptyList()) else cartRepository.observeWishlist(config.storeUrl)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val wishlistIds: StateFlow<Set<Long>> = storeRepository.activeStore
        .flatMapLatest { config ->
            if (config == null) flowOf(emptyList()) else cartRepository.observeWishlistIds(config.storeUrl)
        }
        .combine(flowOf(Unit)) { ids, _ -> ids.toSet() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    private val _couponState = MutableStateFlow(CartCouponState())
    val couponState: StateFlow<CartCouponState> = _couponState.asStateFlow()

    private val _checkoutForm = MutableStateFlow(CheckoutFormState())
    val checkoutForm: StateFlow<CheckoutFormState> = _checkoutForm.asStateFlow()

    private val _ordersState = MutableStateFlow<OrdersUiState>(OrdersUiState.Success(emptyList()))
    val ordersState: StateFlow<OrdersUiState> = _ordersState.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    fun consumeSnackbar() {
        _snackbarMessage.value = null
    }

    fun addToCart(
        product: WooProduct,
        variation: WooProductVariation? = null,
        quantity: Int = 1
    ) {
        val store = activeStore.value ?: return
        viewModelScope.launch {
            cartRepository.addToCart(store.storeUrl, product, variation, quantity)
            _snackbarMessage.value = "Added \"${product.name}\" to bag"
        }
    }

    fun addWishlistItemToCart(item: WishlistItemEntity) {
        val store = activeStore.value ?: return
        viewModelScope.launch {
            val pseudoProduct = WooProduct(
                id = item.productId,
                name = item.name,
                price = item.price.toString(),
                regularPrice = item.regularPrice?.toString().orEmpty(),
                onSale = item.onSale,
                images = if (item.imageUrl.isNotBlank()) {
                    listOf(com.example.data.model.WooProductImage(src = item.imageUrl))
                } else emptyList()
            )
            cartRepository.addToCart(store.storeUrl, pseudoProduct, null, 1)
            _snackbarMessage.value = "Moved \"${item.name}\" to bag"
        }
    }

    fun updateCartQuantity(localId: Long, quantity: Int) {
        viewModelScope.launch {
            cartRepository.updateCartQuantity(localId, quantity)
        }
    }

    fun removeCartItem(localId: Long) {
        viewModelScope.launch {
            cartRepository.removeCartItem(localId)
        }
    }

    fun toggleWishlist(product: WooProduct) {
        val store = activeStore.value ?: return
        viewModelScope.launch {
            cartRepository.toggleWishlist(store.storeUrl, product)
        }
    }

    fun removeFromWishlist(productId: Long) {
        val store = activeStore.value ?: return
        viewModelScope.launch {
            cartRepository.removeFromWishlist(store.storeUrl, productId)
        }
    }

    fun onCouponInputChange(code: String) {
        _couponState.update { it.copy(couponCodeInput = code, errorMessage = null) }
    }

    fun applyCoupon(subtotal: Double) {
        val store = activeStore.value ?: return
        val code = _couponState.value.couponCodeInput.trim()
        viewModelScope.launch {
            _couponState.update { it.copy(isValidating = true, errorMessage = null) }
            cartRepository.validateCoupon(store, code, subtotal).fold(
                onSuccess = { coupon ->
                    _couponState.update {
                        it.copy(
                            appliedCoupon = coupon,
                            isValidating = false,
                            errorMessage = null
                        )
                    }
                    _snackbarMessage.value = "Coupon ${coupon.code.uppercase()} applied"
                },
                onFailure = { err ->
                    _couponState.update {
                        it.copy(
                            isValidating = false,
                            errorMessage = err.message ?: "Invalid coupon code."
                        )
                    }
                }
            )
        }
    }

    fun removeCoupon() {
        _couponState.value = CartCouponState()
    }

    fun calculateDiscount(subtotal: Double): Double {
        return cartRepository.calculateDiscount(subtotal, _couponState.value.appliedCoupon)
    }

    fun prepareCheckout() {
        val store = activeStore.value ?: return
        _checkoutForm.update { it.copy(submitState = CheckoutUiState.Idle, isLoadingGateways = true) }
        viewModelScope.launch {
            cartRepository.fetchEnabledPaymentGateways(store).fold(
                onSuccess = { gateways ->
                    val fallback = if (gateways.isEmpty()) {
                        listOf(
                            WooPaymentGateway(
                                id = "cod",
                                title = "Cash on Delivery / Manual Invoice",
                                description = "Order will be created in WooCommerce as pending payment.",
                                enabled = true
                            )
                        )
                    } else gateways
                    _checkoutForm.update { form ->
                        form.copy(
                            gateways = fallback,
                            isLoadingGateways = false,
                            selectedGatewayId = form.selectedGatewayId
                                ?.takeIf { id -> fallback.any { it.id == id } }
                                ?: fallback.firstOrNull()?.id
                        )
                    }
                },
                onFailure = {
                    val fallback = listOf(
                        WooPaymentGateway(
                            id = "cod",
                            title = "Pay on Delivery / Invoice",
                            description = "Standard WooCommerce order submission.",
                            enabled = true
                        )
                    )
                    _checkoutForm.update {
                        it.copy(
                            gateways = fallback,
                            isLoadingGateways = false,
                            selectedGatewayId = fallback.first().id
                        )
                    }
                }
            )
        }
    }

    fun updateCheckoutForm(transform: (CheckoutFormState) -> CheckoutFormState) {
        _checkoutForm.update { transform(it).copy(submitState = CheckoutUiState.Idle) }
    }

    fun placeOrder() {
        val store: StoreConfig = activeStore.value ?: return
        val form = _checkoutForm.value
        val items = cartItems.value
        val gateway = form.gateways.firstOrNull { it.id == form.selectedGatewayId }
            ?: form.gateways.firstOrNull()

        if (form.firstName.isBlank() || form.lastName.isBlank() || form.email.isBlank() ||
            form.address1.isBlank() || form.city.isBlank() || form.postcode.isBlank()
        ) {
            _checkoutForm.update {
                it.copy(submitState = CheckoutUiState.Error("Please complete all required shipping & contact fields."))
            }
            return
        }
        if (gateway == null) {
            _checkoutForm.update {
                it.copy(submitState = CheckoutUiState.Error("Please select a payment method."))
            }
            return
        }

        viewModelScope.launch {
            _checkoutForm.update { it.copy(submitState = CheckoutUiState.Submitting) }
            val billing = WooBillingAddress(
                firstName = form.firstName.trim(),
                lastName = form.lastName.trim(),
                address1 = form.address1.trim(),
                city = form.city.trim(),
                state = form.state.trim(),
                postcode = form.postcode.trim(),
                country = form.country.trim().ifBlank { "US" }.uppercase(),
                email = form.email.trim(),
                phone = form.phone.trim()
            )
            cartRepository.submitOrder(
                config = store,
                items = items,
                billing = billing,
                paymentGateway = gateway,
                couponCode = _couponState.value.appliedCoupon?.code,
                customerNote = form.customerNote
            ).fold(
                onSuccess = { order ->
                    _couponState.value = CartCouponState()
                    _checkoutForm.update { it.copy(submitState = CheckoutUiState.OrderPlaced(order)) }
                    loadOrders()
                },
                onFailure = { err ->
                    _checkoutForm.update {
                        it.copy(
                            submitState = CheckoutUiState.Error(
                                err.message ?: "Unable to submit order to WooCommerce."
                            )
                        )
                    }
                }
            )
        }
    }

    fun resetCheckoutResult() {
        _checkoutForm.update { it.copy(submitState = CheckoutUiState.Idle) }
    }

    fun loadOrders() {
        val store = activeStore.value ?: return
        viewModelScope.launch {
            _ordersState.value = OrdersUiState.Loading
            val savedMap = storeRepository.recentOrderIds.first()
            val ids = savedMap[store.storeUrl].orEmpty()
            cartRepository.fetchOrders(store, ids).fold(
                onSuccess = { orders ->
                    _ordersState.value = OrdersUiState.Success(orders)
                },
                onFailure = { err ->
                    _ordersState.value = OrdersUiState.Error(err.message ?: "Unable to fetch orders.")
                }
            )
        }
    }

    fun lookupOrderById(orderIdRaw: String) {
        val store = activeStore.value ?: return
        val orderId = orderIdRaw.trim().removePrefix("#").toLongOrNull()
        if (orderId == null) {
            _snackbarMessage.value = "Enter a valid numeric order ID"
            return
        }
        viewModelScope.launch {
            _ordersState.value = OrdersUiState.Loading
            cartRepository.lookupOrderById(store, orderId).fold(
                onSuccess = { order ->
                    _ordersState.value = OrdersUiState.Success(listOf(order))
                },
                onFailure = { err ->
                    _ordersState.value = OrdersUiState.Error(err.message ?: "Order #$orderId not found.")
                }
            )
        }
    }

    class Factory(
        private val storeRepository: StoreRepository,
        private val cartRepository: CartRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return CartCheckoutViewModel(storeRepository, cartRepository) as T
        }
    }
}
