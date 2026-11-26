package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.StoreConfig
import com.example.data.model.WooProduct
import com.example.data.model.WooProductCategory
import com.example.data.model.WooProductVariation
import com.example.data.repository.CatalogRepository
import com.example.data.repository.CatalogSortOption
import com.example.data.repository.HomeFeedData
import com.example.data.repository.ProductDetailData
import com.example.data.repository.StoreRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface HomeUiState {
    data object Idle : HomeUiState
    data object Loading : HomeUiState
    data class Success(val data: HomeFeedData, val isRefreshing: Boolean = false) : HomeUiState
    data class Error(val message: String) : HomeUiState
}

data class CatalogFilterState(
    val searchQuery: String = "",
    val selectedCategoryId: Long? = null,
    val selectedCategoryName: String? = null,
    val sortOption: CatalogSortOption = CatalogSortOption.NEWEST,
    val onSaleOnly: Boolean = false,
    val inStockOnly: Boolean = false,
    val minPrice: String = "",
    val maxPrice: String = ""
)

sealed interface CatalogUiState {
    data object Loading : CatalogUiState
    data class Success(
        val products: List<WooProduct>,
        val categories: List<WooProductCategory>,
        val currentPage: Int,
        val hasMore: Boolean,
        val isLoadingMore: Boolean = false
    ) : CatalogUiState
    data class Error(val message: String) : CatalogUiState
}

sealed interface ProductDetailUiState {
    data object Loading : ProductDetailUiState
    data class Success(
        val data: ProductDetailData,
        val selectedAttributes: Map<String, String>,
        val matchedVariation: WooProductVariation?
    ) : ProductDetailUiState
    data class Error(val message: String) : ProductDetailUiState
}

class StorefrontViewModel(
    private val storeRepository: StoreRepository,
    private val catalogRepository: CatalogRepository
) : ViewModel() {

    private var currentConfig: StoreConfig? = null
    private var searchDebounceJob: Job? = null

    private val _homeState = MutableStateFlow<HomeUiState>(HomeUiState.Idle)
    val homeState: StateFlow<HomeUiState> = _homeState.asStateFlow()

    private val _filterState = MutableStateFlow(CatalogFilterState())
    val filterState: StateFlow<CatalogFilterState> = _filterState.asStateFlow()

    private val _catalogState = MutableStateFlow<CatalogUiState>(CatalogUiState.Loading)
    val catalogState: StateFlow<CatalogUiState> = _catalogState.asStateFlow()

    private val _productDetailState = MutableStateFlow<ProductDetailUiState>(ProductDetailUiState.Loading)
    val productDetailState: StateFlow<ProductDetailUiState> = _productDetailState.asStateFlow()

    private var cachedCategories: List<WooProductCategory> = emptyList()

    init {
        viewModelScope.launch {
            storeRepository.activeStore.collectLatest { config ->
                val changed = currentConfig?.storeUrl != config?.storeUrl ||
                    currentConfig?.lastSyncedAt != config?.lastSyncedAt
                currentConfig = config
                if (config != null && changed) {
                    cachedCategories = emptyList()
                    loadHomeFeed(refresh = false)
                    loadCatalogPage(page = 1, append = false)
                } else if (config == null) {
                    _homeState.value = HomeUiState.Idle
                }
            }
        }
    }

    fun loadHomeFeed(refresh: Boolean = true) {
        val config = currentConfig ?: return
        viewModelScope.launch {
            val current = _homeState.value
            if (refresh && current is HomeUiState.Success) {
                _homeState.value = current.copy(isRefreshing = true)
            } else if (current !is HomeUiState.Success) {
                _homeState.value = HomeUiState.Loading
            }

            catalogRepository.fetchHomeFeed(config).fold(
                onSuccess = { feed ->
                    if (feed.categories.isNotEmpty()) {
                        cachedCategories = feed.categories
                    }
                    _homeState.value = HomeUiState.Success(feed, isRefreshing = false)
                },
                onFailure = { err ->
                    _homeState.value = HomeUiState.Error(err.message ?: "Failed to load store catalog.")
                }
            )
        }
    }

    fun applyExploreNavigationFilter(
        categoryId: Long?,
        categoryName: String?,
        onSaleOnly: Boolean
    ) {
        _filterState.value = CatalogFilterState(
            selectedCategoryId = categoryId,
            selectedCategoryName = categoryName,
            onSaleOnly = onSaleOnly
        )
        loadCatalogPage(page = 1, append = false)
    }

    fun onSearchQueryChanged(query: String) {
        _filterState.update { it.copy(searchQuery = query) }
        searchDebounceJob?.cancel()
        searchDebounceJob = viewModelScope.launch {
            delay(380)
            loadCatalogPage(page = 1, append = false)
        }
    }

    fun updateFilters(
        categoryId: Long? = _filterState.value.selectedCategoryId,
        categoryName: String? = _filterState.value.selectedCategoryName,
        sortOption: CatalogSortOption = _filterState.value.sortOption,
        onSaleOnly: Boolean = _filterState.value.onSaleOnly,
        inStockOnly: Boolean = _filterState.value.inStockOnly,
        minPrice: String = _filterState.value.minPrice,
        maxPrice: String = _filterState.value.maxPrice
    ) {
        _filterState.update {
            it.copy(
                selectedCategoryId = categoryId,
                selectedCategoryName = categoryName,
                sortOption = sortOption,
                onSaleOnly = onSaleOnly,
                inStockOnly = inStockOnly,
                minPrice = minPrice,
                maxPrice = maxPrice
            )
        }
        loadCatalogPage(page = 1, append = false)
    }

    fun clearAllFilters() {
        _filterState.value = CatalogFilterState()
        loadCatalogPage(page = 1, append = false)
    }

    fun loadNextCatalogPage() {
        val current = _catalogState.value
        if (current !is CatalogUiState.Success || !current.hasMore || current.isLoadingMore) return
        loadCatalogPage(page = current.currentPage + 1, append = true)
    }

    fun loadCatalogPage(page: Int = 1, append: Boolean = false) {
        val config = currentConfig ?: return
        viewModelScope.launch {
            if (append) {
                val existing = _catalogState.value as? CatalogUiState.Success ?: return@launch
                _catalogState.value = existing.copy(isLoadingMore = true)
            } else {
                _catalogState.value = CatalogUiState.Loading
            }

            if (cachedCategories.isEmpty()) {
                catalogRepository.fetchCategories(config).onSuccess { cachedCategories = it }
            }

            val filter = _filterState.value
            val perPage = 20
            catalogRepository.fetchProducts(
                config = config,
                page = page,
                perPage = perPage,
                search = filter.searchQuery,
                categoryId = filter.selectedCategoryId,
                sort = filter.sortOption,
                onSaleOnly = filter.onSaleOnly,
                inStockOnly = filter.inStockOnly,
                minPrice = filter.minPrice,
                maxPrice = filter.maxPrice
            ).fold(
                onSuccess = { fetched ->
                    val combined = if (append && _catalogState.value is CatalogUiState.Success) {
                        ((_catalogState.value as CatalogUiState.Success).products + fetched).distinctBy { it.id }
                    } else {
                        fetched
                    }
                    _catalogState.value = CatalogUiState.Success(
                        products = combined,
                        categories = cachedCategories,
                        currentPage = page,
                        hasMore = fetched.size >= perPage,
                        isLoadingMore = false
                    )
                },
                onFailure = { err ->
                    if (append && _catalogState.value is CatalogUiState.Success) {
                        val existing = _catalogState.value as CatalogUiState.Success
                        _catalogState.value = existing.copy(isLoadingMore = false)
                    } else {
                        _catalogState.value = CatalogUiState.Error(err.message ?: "Unable to fetch products.")
                    }
                }
            )
        }
    }

    fun loadProductDetail(productId: Long) {
        val config = currentConfig ?: return
        viewModelScope.launch {
            _productDetailState.value = ProductDetailUiState.Loading
            catalogRepository.fetchProductDetail(config, productId).fold(
                onSuccess = { detail ->
                    val defaultAttributes = mutableMapOf<String, String>()
                    val firstPurchasable = detail.variations.firstOrNull {
                        it.purchasable && it.stockStatus != "outofstock"
                    } ?: detail.variations.firstOrNull()

                    if (firstPurchasable != null) {
                        firstPurchasable.attributes.forEach { attr ->
                            if (attr.name.isNotBlank() && attr.option.isNotBlank()) {
                                defaultAttributes[attr.name] = attr.option
                            }
                        }
                    } else {
                        detail.product.attributes
                            .filter { it.variation && it.options.isNotEmpty() }
                            .forEach { attr ->
                                defaultAttributes[attr.name] = attr.options.first()
                            }
                    }

                    val matched = findMatchingVariation(detail.variations, defaultAttributes)
                    _productDetailState.value = ProductDetailUiState.Success(
                        data = detail,
                        selectedAttributes = defaultAttributes,
                        matchedVariation = matched
                    )
                },
                onFailure = { err ->
                    _productDetailState.value = ProductDetailUiState.Error(
                        err.message ?: "Unable to load product details."
                    )
                }
            )
        }
    }

    fun selectProductAttribute(attributeName: String, option: String) {
        val current = _productDetailState.value as? ProductDetailUiState.Success ?: return
        val updated = current.selectedAttributes.toMutableMap().apply {
            put(attributeName, option)
        }
        val matched = findMatchingVariation(current.data.variations, updated)
        _productDetailState.value = current.copy(
            selectedAttributes = updated,
            matchedVariation = matched
        )
    }

    private fun findMatchingVariation(
        variations: List<WooProductVariation>,
        selected: Map<String, String>
    ): WooProductVariation? {
        if (variations.isEmpty() || selected.isEmpty()) return null
        return variations.firstOrNull { variation ->
            variation.attributes.all { varAttr ->
                val chosen = selected[varAttr.name]
                varAttr.option.isBlank() || (chosen != null && chosen.equals(varAttr.option, ignoreCase = true))
            }
        }
    }

    class Factory(
        private val storeRepository: StoreRepository,
        private val catalogRepository: CatalogRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return StorefrontViewModel(storeRepository, catalogRepository) as T
        }
    }
}
