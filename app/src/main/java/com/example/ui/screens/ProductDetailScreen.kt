package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.RateReview
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.example.R
import com.example.data.model.CustomerSession
import com.example.data.model.StoreConfig
import com.example.data.model.WooProduct
import com.example.data.model.WooProductVariation
import com.example.ui.components.PriceTagRow
import com.example.ui.components.ProductCard
import com.example.ui.components.ProductImagePlaceholder
import com.example.ui.components.ShimmerBlock
import com.example.ui.components.StoreErrorCard
import com.example.ui.theme.GoldRating
import com.example.ui.theme.JetBrainsMonoFontFamily
import com.example.ui.viewmodel.ProductDetailUiState
import com.example.util.HtmlTextParser
import com.example.util.PriceFormatter

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    storeConfig: StoreConfig,
    detailState: ProductDetailUiState,
    wishlistIds: Set<Long>,
    activeCustomer: CustomerSession?,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onSelectAttribute: (String, String) -> Unit,
    onToggleWishlist: (WooProduct) -> Unit,
    onAddToCart: (WooProduct, WooProductVariation?, Int) -> Unit,
    onSubmitReview: (Long, String, String, Int, String, (Boolean, String) -> Unit) -> Unit,
    onProductClick: (Long) -> Unit
) {
    var quantity by remember { mutableIntStateOf(1) }
    var showReviewSheet by remember { mutableStateOf(false) }

    when (detailState) {
        ProductDetailUiState.Loading -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
        is ProductDetailUiState.Error -> {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .statusBarsPadding()
                    .padding(20.dp)
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = stringResource(R.string.cd_back)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                StoreErrorCard(message = detailState.message, onRetry = onRetry)
            }
        }
        is ProductDetailUiState.Success -> {
            val product = detailState.data.product
            val variation = detailState.matchedVariation
            val isWishlisted = product.id in wishlistIds
            val cleanName = HtmlTextParser.decodeEntities(product.name)
            val description = HtmlTextParser.toPlainText(product.description)
                .ifBlank { HtmlTextParser.toPlainText(product.shortDescription) }

            val activePrice = variation?.price?.takeIf { it.isNotBlank() } ?: product.price
            val activeRegular = variation?.regularPrice?.takeIf { it.isNotBlank() } ?: product.regularPrice
            val activeOnSale = variation?.onSale ?: product.onSale
            val activeStockStatus = variation?.stockStatus ?: product.stockStatus
            val isPurchasable = (variation?.purchasable ?: product.purchasable) && activeStockStatus != "outofstock"
            val activeSku = variation?.sku?.takeIf { it.isNotBlank() } ?: product.sku

            val galleryUrls = remember(product.images, variation?.image) {
                val base = product.images.map { it.src }.filter { it.isNotBlank() }
                val varImg = variation?.image?.src?.takeIf { it.isNotBlank() }
                if (varImg != null && varImg !in base) listOf(varImg) + base else base
            }
            val pagerState = rememberPagerState(pageCount = { galleryUrls.size.coerceAtLeast(1) })

            val unitPrice = activePrice.toDoubleOrNull() ?: activeRegular.toDoubleOrNull() ?: 0.0
            val totalForButton = PriceFormatter.format(unitPrice * quantity, storeConfig.currencySymbol)

            Scaffold(
                contentWindowInsets = WindowInsets(0),
                bottomBar = {
                    Surface(
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        shadowElevation = 8.dp
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .navigationBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Quantity Stepper
                            Surface(
                                shape = RoundedCornerShape(50),
                                color = MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 4.dp)
                                ) {
                                    IconButton(
                                        onClick = { if (quantity > 1) quantity-- },
                                        enabled = quantity > 1,
                                        modifier = Modifier.testTag("detail_qty_minus")
                                    ) {
                                        Icon(Icons.Filled.Remove, contentDescription = "Decrease quantity")
                                    }
                                    Text(
                                        text = quantity.toString(),
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontFamily = JetBrainsMonoFontFamily
                                        ),
                                        modifier = Modifier.padding(horizontal = 6.dp)
                                    )
                                    IconButton(
                                        onClick = { if (quantity < 99) quantity++ },
                                        modifier = Modifier.testTag("detail_qty_plus")
                                    ) {
                                        Icon(Icons.Filled.Add, contentDescription = "Increase quantity")
                                    }
                                }
                            }

                            Button(
                                onClick = { onAddToCart(product, variation, quantity) },
                                enabled = isPurchasable,
                                shape = RoundedCornerShape(50),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp)
                                    .testTag("detail_add_to_cart"),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                )
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.ShoppingBag,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (isPurchasable) "Add • $totalForButton" else "Out of Stock",
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                        }
                    }
                }
            ) { innerPadding ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Full-bleed Image Carousel
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        HorizontalPager(
                            state = pagerState,
                            modifier = Modifier.fillMaxSize()
                        ) { page ->
                            val imgUrl = galleryUrls.getOrNull(page).orEmpty()
                            if (imgUrl.isNotBlank()) {
                                SubcomposeAsyncImage(
                                    model = imgUrl,
                                    contentDescription = cleanName,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                    loading = { ShimmerBlock(Modifier.fillMaxSize()) },
                                    error = { ProductImagePlaceholder() }
                                )
                            } else {
                                ProductImagePlaceholder()
                            }
                        }

                        // Floating Top Navigation Overlay
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                                shadowElevation = 2.dp
                            ) {
                                IconButton(
                                    onClick = onBack,
                                    modifier = Modifier.testTag("detail_back_button")
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = stringResource(R.string.cd_back)
                                    )
                                }
                            }

                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                                shadowElevation = 2.dp
                            ) {
                                IconButton(
                                    onClick = { onToggleWishlist(product) },
                                    modifier = Modifier.testTag("detail_wishlist_button")
                                ) {
                                    Icon(
                                        imageVector = if (isWishlisted) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                        contentDescription = stringResource(R.string.cd_wishlist),
                                        tint = if (isWishlisted) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }

                        // Page Indicators
                        if (galleryUrls.size > 1) {
                            Row(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = 14.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                repeat(galleryUrls.size) { index ->
                                    val selected = pagerState.currentPage == index
                                    Box(
                                        modifier = Modifier
                                            .height(6.dp)
                                            .width(if (selected) 20.dp else 6.dp)
                                            .clip(CircleShape)
                                            .background(
                                                if (selected) MaterialTheme.colorScheme.primary
                                                else MaterialTheme.colorScheme.surface.copy(alpha = 0.65f)
                                            )
                                    )
                                }
                            }
                        }
                    }

                    Column(
                        modifier = Modifier
                            .widthIn(max = 640.dp)
                            .fillMaxWidth()
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Category + Stock Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val catName = HtmlTextParser.decodeEntities(product.categories.firstOrNull()?.name)
                            if (catName.isNotBlank()) {
                                Surface(
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                    shape = RoundedCornerShape(50)
                                ) {
                                    Text(
                                        text = catName.uppercase(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                    )
                                }
                            }

                            Surface(
                                color = if (isPurchasable) MaterialTheme.colorScheme.tertiaryContainer
                                else MaterialTheme.colorScheme.errorContainer,
                                shape = RoundedCornerShape(50)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    if (isPurchasable) {
                                        Icon(
                                            imageVector = Icons.Outlined.CheckCircle,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                    Text(
                                        text = when (activeStockStatus) {
                                            "outofstock" -> "Out of Stock"
                                            "onbackorder" -> "On Backorder"
                                            else -> "In Stock"
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (isPurchasable) MaterialTheme.colorScheme.onTertiaryContainer
                                        else MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                        }

                        Text(
                            text = cleanName,
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onBackground
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            PriceTagRow(
                                price = activePrice,
                                regularPrice = activeRegular,
                                onSale = activeOnSale,
                                currencySymbol = storeConfig.currencySymbol
                            )

                            if (product.ratingCount > 0) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Star,
                                        contentDescription = null,
                                        tint = GoldRating,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "${product.averageRating} (${product.ratingCount})",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }

                        if (activeSku.isNotBlank()) {
                            Text(
                                text = "SKU: $activeSku",
                                style = MaterialTheme.typography.bodySmall.copy(fontFamily = JetBrainsMonoFontFamily),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // Variable Product Attribute Selectors
                        val variationAttrs = product.attributes.filter { it.variation && it.options.isNotEmpty() }
                        if (variationAttrs.isNotEmpty()) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            variationAttrs.forEach { attr ->
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        text = attr.name,
                                        style = MaterialTheme.typography.titleSmall,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        attr.options.forEach { option ->
                                            val isSelected = detailState.selectedAttributes[attr.name]
                                                ?.equals(option, ignoreCase = true) == true
                                            FilterChip(
                                                selected = isSelected,
                                                onClick = { onSelectAttribute(attr.name, option) },
                                                label = { Text(option) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Description
                        if (description.isNotBlank()) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "Product Details",
                                    style = MaterialTheme.typography.titleLarge
                                )
                                Text(
                                    text = description,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        // Reviews
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Customer Reviews (${detailState.data.reviews.size})",
                                    style = MaterialTheme.typography.titleLarge
                                )
                                TextButton(
                                    onClick = { showReviewSheet = true },
                                    modifier = Modifier.testTag("write_review_button")
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.RateReview,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Write Review")
                                }
                            }
                            if (detailState.data.reviews.isEmpty()) {
                                Text(
                                    text = "No reviews yet. Be the first to review this product.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            } else {
                                detailState.data.reviews.take(5).forEach { review ->
                                    Surface(
                                        shape = MaterialTheme.shapes.medium,
                                        color = MaterialTheme.colorScheme.surface,
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(14.dp),
                                            verticalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    Text(
                                                        text = review.reviewer.ifBlank { "Customer" },
                                                        style = MaterialTheme.typography.titleSmall
                                                    )
                                                    if (review.verified) {
                                                        Icon(
                                                            imageVector = Icons.Outlined.Verified,
                                                            contentDescription = "Verified buyer",
                                                            tint = MaterialTheme.colorScheme.tertiary,
                                                            modifier = Modifier.size(14.dp)
                                                        )
                                                    }
                                                }
                                                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                                    repeat(review.rating.coerceIn(1, 5)) {
                                                        Icon(
                                                            imageVector = Icons.Filled.Star,
                                                            contentDescription = null,
                                                            tint = GoldRating,
                                                            modifier = Modifier.size(13.dp)
                                                        )
                                                    }
                                                }
                                            }
                                            Text(
                                                text = HtmlTextParser.toPlainText(review.review),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        if (showReviewSheet) {
                            var reviewerName by remember(activeCustomer) {
                                mutableStateOf(activeCustomer?.fullName.orEmpty())
                            }
                            var reviewerEmail by remember(activeCustomer) {
                                mutableStateOf(activeCustomer?.email.orEmpty())
                            }
                            var rating by remember { mutableIntStateOf(5) }
                            var reviewBody by remember { mutableStateOf("") }
                            var submitting by remember { mutableStateOf(false) }
                            var errorText by remember { mutableStateOf<String?>(null) }

                            ModalBottomSheet(
                                onDismissRequest = { showReviewSheet = false },
                                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 24.dp, vertical = 14.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text("Write a Review", style = MaterialTheme.typography.headlineSmall)
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        (1..5).forEach { star ->
                                            IconButton(onClick = { rating = star }) {
                                                Icon(
                                                    imageVector = if (star <= rating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                                                    contentDescription = "$star stars",
                                                    tint = GoldRating,
                                                    modifier = Modifier.size(28.dp)
                                                )
                                            }
                                        }
                                    }
                                    OutlinedTextField(
                                        value = reviewerName,
                                        onValueChange = { reviewerName = it },
                                        label = { Text("Your Name *") },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    OutlinedTextField(
                                        value = reviewerEmail,
                                        onValueChange = { reviewerEmail = it },
                                        label = { Text("Email Address *") },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    OutlinedTextField(
                                        value = reviewBody,
                                        onValueChange = { reviewBody = it },
                                        label = { Text("Your Review *") },
                                        minLines = 3,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    errorText?.let {
                                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                                    }
                                    Button(
                                        onClick = {
                                            submitting = true
                                            errorText = null
                                            onSubmitReview(
                                                product.id,
                                                reviewerName,
                                                reviewerEmail,
                                                rating,
                                                reviewBody
                                            ) { ok, msg ->
                                                submitting = false
                                                if (ok) showReviewSheet = false else errorText = msg
                                            }
                                        },
                                        enabled = !submitting,
                                        shape = RoundedCornerShape(50),
                                        modifier = Modifier.fillMaxWidth().height(50.dp)
                                    ) {
                                        Text(if (submitting) "Submitting…" else "Post Review")
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                }
                            }
                        }

                        // Related Products
                        if (detailState.data.relatedProducts.isNotEmpty()) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                            Text(
                                text = "You May Also Like",
                                style = MaterialTheme.typography.titleLarge
                            )
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                contentPadding = PaddingValues(bottom = 8.dp)
                            ) {
                                items(detailState.data.relatedProducts, key = { it.id }) { related ->
                                    ProductCard(
                                        product = related,
                                        currencySymbol = storeConfig.currencySymbol,
                                        isWishlisted = related.id in wishlistIds,
                                        onProductClick = onProductClick,
                                        onToggleWishlist = onToggleWishlist,
                                        onQuickAdd = { p -> onAddToCart(p, null, 1) },
                                        modifier = Modifier.width(168.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
