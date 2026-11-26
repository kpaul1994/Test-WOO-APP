package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.SearchOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.StoreConfig
import com.example.data.model.WooProduct
import com.example.data.repository.CatalogSortOption
import com.example.ui.components.CategoryPillCard
import com.example.ui.components.ProductCard
import com.example.ui.components.ShimmerProductCard
import com.example.ui.components.StoreErrorCard
import com.example.ui.viewmodel.CatalogFilterState
import com.example.ui.viewmodel.CatalogUiState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ExploreScreen(
    storeConfig: StoreConfig,
    filterState: CatalogFilterState,
    catalogState: CatalogUiState,
    wishlistIds: Set<Long>,
    onSearchQueryChange: (String) -> Unit,
    onSelectCategory: (Long?, String?) -> Unit,
    onApplyFilters: (CatalogSortOption, Boolean, Boolean, String, String) -> Unit,
    onClearFilters: () -> Unit,
    onLoadNextPage: () -> Unit,
    onRetry: () -> Unit,
    onProductClick: (Long) -> Unit,
    onToggleWishlist: (WooProduct) -> Unit,
    onQuickAdd: (WooProduct) -> Unit
) {
    var showFilterSheet by remember { mutableStateOf(false) }
    val gridState = rememberLazyGridState()

    val shouldLoadMore by remember(catalogState) {
        derivedStateOf {
            val success = catalogState as? CatalogUiState.Success ?: return@derivedStateOf false
            if (!success.hasMore || success.isLoadingMore) return@derivedStateOf false
            val lastVisible = gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisible >= (success.products.size - 4).coerceAtLeast(0)
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) {
            onLoadNextPage()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 12.dp)
    ) {
        // Search + Filter Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = filterState.searchQuery,
                onValueChange = onSearchQueryChange,
                placeholder = { Text("Search ${storeConfig.storeName}…") },
                leadingIcon = {
                    Icon(Icons.Outlined.Search, contentDescription = stringResource(R.string.cd_search))
                },
                trailingIcon = {
                    if (filterState.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchQueryChange("") }) {
                            Icon(Icons.Outlined.Clear, contentDescription = "Clear search")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .weight(1f)
                    .testTag("explore_search_input")
            )

            val hasActiveFilters = filterState.onSaleOnly ||
                filterState.inStockOnly ||
                filterState.minPrice.isNotBlank() ||
                filterState.maxPrice.isNotBlank() ||
                filterState.sortOption != CatalogSortOption.NEWEST

            Surface(
                shape = RoundedCornerShape(14.dp),
                color = if (hasActiveFilters) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                IconButton(
                    onClick = { showFilterSheet = true },
                    modifier = Modifier
                        .size(52.dp)
                        .testTag("explore_filter_button")
                ) {
                    Icon(
                        imageVector = Icons.Outlined.FilterList,
                        contentDescription = stringResource(R.string.cd_filters),
                        tint = if (hasActiveFilters) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Categories Rail (if loaded)
        val categories = (catalogState as? CatalogUiState.Success)?.categories.orEmpty()
        if (categories.isNotEmpty()) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = filterState.selectedCategoryId == null,
                        onClick = { onSelectCategory(null, null) },
                        label = { Text("All") },
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.height(42.dp)
                    )
                }
                items(categories, key = { it.id }) { category ->
                    CategoryPillCard(
                        category = category,
                        isSelected = filterState.selectedCategoryId == category.id,
                        onClick = {
                            if (filterState.selectedCategoryId == category.id) {
                                onSelectCategory(null, null)
                            } else {
                                onSelectCategory(category.id, category.name)
                            }
                        }
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Active Filter Summary Strip
        if (filterState.selectedCategoryName != null || filterState.onSaleOnly || filterState.inStockOnly) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = buildString {
                        append(filterState.sortOption.label)
                        filterState.selectedCategoryName?.let { append(" • $it") }
                        if (filterState.onSaleOnly) append(" • On Sale")
                        if (filterState.inStockOnly) append(" • In Stock")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                TextButton(onClick = onClearFilters) {
                    Text("Reset")
                }
            }
        }

        when (catalogState) {
            CatalogUiState.Loading -> {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 165.dp),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(6) { ShimmerProductCard() }
                }
            }
            is CatalogUiState.Error -> {
                Box(modifier = Modifier.padding(16.dp)) {
                    StoreErrorCard(message = catalogState.message, onRetry = onRetry)
                }
            }
            is CatalogUiState.Success -> {
                if (catalogState.products.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.SearchOff,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "No matching products",
                            style = MaterialTheme.typography.titleLarge
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Try adjusting your search query or clearing active filters.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedButton(onClick = onClearFilters) {
                            Text("Clear Filters")
                        }
                    }
                } else {
                    LazyVerticalGrid(
                        state = gridState,
                        columns = GridCells.Adaptive(minSize = 165.dp),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(catalogState.products, key = { it.id }) { product ->
                            ProductCard(
                                product = product,
                                currencySymbol = storeConfig.currencySymbol,
                                isWishlisted = product.id in wishlistIds,
                                onProductClick = onProductClick,
                                onToggleWishlist = onToggleWishlist,
                                onQuickAdd = onQuickAdd
                            )
                        }

                        if (catalogState.isLoadingMore) {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(28.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showFilterSheet) {
        var sortDraft by remember { mutableStateOf(filterState.sortOption) }
        var onSaleDraft by remember { mutableStateOf(filterState.onSaleOnly) }
        var inStockDraft by remember { mutableStateOf(filterState.inStockOnly) }
        var minPriceDraft by remember { mutableStateOf(filterState.minPrice) }
        var maxPriceDraft by remember { mutableStateOf(filterState.maxPrice) }

        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showFilterSheet = false },
            sheetState = sheetState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Sort & Filter",
                    style = MaterialTheme.typography.headlineSmall
                )

                Text(
                    text = "Sort By",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CatalogSortOption.entries.forEach { option ->
                        FilterChip(
                            selected = sortDraft == option,
                            onClick = { sortDraft = option },
                            label = { Text(option.label) }
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("On Sale Only", style = MaterialTheme.typography.titleMedium)
                    Switch(checked = onSaleDraft, onCheckedChange = { onSaleDraft = it })
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("In Stock Only", style = MaterialTheme.typography.titleMedium)
                    Switch(checked = inStockDraft, onCheckedChange = { inStockDraft = it })
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = minPriceDraft,
                        onValueChange = { minPriceDraft = it },
                        label = { Text("Min (${storeConfig.currencySymbol})") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = maxPriceDraft,
                        onValueChange = { maxPriceDraft = it },
                        label = { Text("Max (${storeConfig.currencySymbol})") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            onClearFilters()
                            showFilterSheet = false
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                    ) {
                        Text("Reset")
                    }
                    Button(
                        onClick = {
                            onApplyFilters(sortDraft, onSaleDraft, inStockDraft, minPriceDraft, maxPriceDraft)
                            showFilterSheet = false
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                    ) {
                        Text("Apply")
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}
