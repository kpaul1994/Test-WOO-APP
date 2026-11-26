package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.StoreConfig
import com.example.data.model.WooProduct
import com.example.ui.components.CategoryPillCard
import com.example.ui.components.ProductCard
import com.example.ui.components.ShimmerProductCard
import com.example.ui.components.StoreErrorCard
import com.example.ui.viewmodel.HomeUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    storeConfig: StoreConfig,
    homeState: HomeUiState,
    wishlistIds: Set<Long>,
    showDemoStoreControls: Boolean,
    onRefresh: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenCategory: (Long, String) -> Unit,
    onOpenDeals: () -> Unit,
    onProductClick: (Long) -> Unit,
    onToggleWishlist: (WooProduct) -> Unit,
    onQuickAdd: (WooProduct) -> Unit,
    onSwitchStore: () -> Unit
) {
    val isRefreshing = (homeState as? HomeUiState.Success)?.isRefreshing == true

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize()
    ) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 165.dp),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            // Top Editorial Store Header
            item(span = { GridItemSpan(maxLineSpan) }) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.tertiary)
                            )
                            Text(
                                text = "CONNECTED STORE",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        }
                        Text(
                            text = storeConfig.storeName,
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onBackground,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (storeConfig.tagline.isNotBlank()) {
                            Text(
                                text = storeConfig.tagline,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                        ) {
                            IconButton(
                                onClick = onOpenSearch,
                                modifier = Modifier.testTag("home_search_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Search,
                                    contentDescription = stringResource(R.string.cd_search),
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                        if (showDemoStoreControls) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.surface,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                            ) {
                                IconButton(
                                    onClick = onSwitchStore,
                                    modifier = Modifier.testTag("home_switch_store_button")
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.SwapHoriz,
                                        contentDescription = "Switch WooCommerce store",
                                        tint = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Editorial Collection Hero Banner
            item(span = { GridItemSpan(maxLineSpan) }) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(190.dp)
                        .clip(MaterialTheme.shapes.large)
                        .clickable { onOpenSearch() }
                        .testTag("home_hero_banner")
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.img_store_banner),
                        contentDescription = "Curated store collection banner",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        Color(0xFF181615).copy(alpha = 0.84f),
                                        Color(0xFF181615).copy(alpha = 0.28f)
                                    )
                                )
                            )
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.secondary,
                            shape = RoundedCornerShape(50)
                        ) {
                            Text(
                                text = "LIVE CATALOG",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                        Text(
                            text = "New Season\nCurated Arrivals",
                            style = MaterialTheme.typography.headlineMedium,
                            color = Color.White
                        )
                        Button(
                            onClick = onOpenSearch,
                            shape = RoundedCornerShape(50),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color(0xFF181615)
                            ),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = "Explore All",
                                style = MaterialTheme.typography.labelLarge
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            when (homeState) {
                HomeUiState.Idle, HomeUiState.Loading -> {
                    items(6) {
                        ShimmerProductCard()
                    }
                }
                is HomeUiState.Error -> {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        StoreErrorCard(
                            message = homeState.message,
                            onRetry = onRefresh
                        )
                    }
                }
                is HomeUiState.Success -> {
                    val feed = homeState.data

                    // Categories Rail
                    if (feed.categories.isNotEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Shop by Category",
                                        style = MaterialTheme.typography.titleLarge
                                    )
                                    TextButton(onClick = onOpenSearch) {
                                        Text("See all")
                                    }
                                }
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(feed.categories, key = { it.id }) { category ->
                                        CategoryPillCard(
                                            category = category,
                                            onClick = { onOpenCategory(category.id, category.name) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // On Sale Rail
                    if (feed.onSaleProducts.isNotEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Outlined.LocalOffer,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.secondary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Text(
                                            text = "Special Offers",
                                            style = MaterialTheme.typography.titleLarge
                                        )
                                    }
                                    TextButton(onClick = onOpenDeals) {
                                        Text("View deals")
                                    }
                                }
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(feed.onSaleProducts, key = { "sale_${it.id}" }) { product ->
                                        ProductCard(
                                            product = product,
                                            currencySymbol = storeConfig.currencySymbol,
                                            isWishlisted = product.id in wishlistIds,
                                            onProductClick = onProductClick,
                                            onToggleWishlist = onToggleWishlist,
                                            onQuickAdd = onQuickAdd,
                                            modifier = Modifier.width(172.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Featured Spotlight Rail (if distinct)
                    if (feed.featuredProducts.isNotEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(
                                text = "Featured Highlights",
                                style = MaterialTheme.typography.titleLarge,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(feed.featuredProducts, key = { "feat_${it.id}" }) { product ->
                                    ProductCard(
                                        product = product,
                                        currencySymbol = storeConfig.currencySymbol,
                                        isWishlisted = product.id in wishlistIds,
                                        onProductClick = onProductClick,
                                        onToggleWishlist = onToggleWishlist,
                                        onQuickAdd = onQuickAdd,
                                        modifier = Modifier.width(184.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Latest Arrivals Grid
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Latest Products",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = "${feed.latestProducts.size} items",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    if (feed.latestProducts.isEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Surface(
                                shape = MaterialTheme.shapes.large,
                                color = MaterialTheme.colorScheme.surface,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Storefront,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(36.dp)
                                    )
                                    Text(
                                        text = "No published products found",
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Text(
                                        text = "Publish products in your WooCommerce store to see them here.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    } else {
                        items(feed.latestProducts, key = { "latest_${it.id}" }) { product ->
                            ProductCard(
                                product = product,
                                currencySymbol = storeConfig.currencySymbol,
                                isWishlisted = product.id in wishlistIds,
                                onProductClick = onProductClick,
                                onToggleWishlist = onToggleWishlist,
                                onQuickAdd = onQuickAdd
                            )
                        }
                    }
                }
            }
        }
    }
}
