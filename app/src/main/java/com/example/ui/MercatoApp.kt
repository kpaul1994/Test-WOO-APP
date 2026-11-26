package com.example.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.example.BuildConfig
import com.example.R
import com.example.data.model.CustomerSession
import com.example.data.model.StoreConfig
import com.example.ui.navigation.CartRoute
import com.example.ui.navigation.CheckoutRoute
import com.example.ui.navigation.ConnectStoreRoute
import com.example.ui.navigation.ExploreRoute
import com.example.ui.navigation.HomeRoute
import com.example.ui.navigation.OrdersAndStoreRoute
import com.example.ui.navigation.ProductDetailRoute
import com.example.ui.navigation.WishlistRoute
import com.example.ui.screens.CartScreen
import com.example.ui.screens.CheckoutScreen
import com.example.ui.screens.ConnectStoreScreen
import com.example.ui.screens.ExploreScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.OrdersAndStoreScreen
import com.example.ui.screens.ProductDetailScreen
import com.example.ui.screens.WishlistScreen
import com.example.ui.theme.MercatoTheme
import com.example.ui.viewmodel.ActiveStoreState
import com.example.ui.viewmodel.AuthViewModel
import com.example.ui.viewmodel.CartCheckoutViewModel
import com.example.ui.viewmodel.StoreConnectionViewModel
import com.example.ui.viewmodel.StorefrontViewModel
import kotlinx.coroutines.launch

private data class TopLevelDestination(
    val route: Any,
    val labelRes: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val testTag: String,
    val matchClass: Class<*>
)

@Composable
fun MercatoApp(
    connectionViewModel: StoreConnectionViewModel,
    storefrontViewModel: StorefrontViewModel,
    cartViewModel: CartCheckoutViewModel,
    authViewModel: AuthViewModel
) {
    val themeMode by connectionViewModel.themeMode.collectAsStateWithLifecycle()
    val hideDemoControls by connectionViewModel.hideDemoControls.collectAsStateWithLifecycle()
    val storeState by connectionViewModel.storeState.collectAsStateWithLifecycle()
    val savedStores by connectionViewModel.savedStores.collectAsStateWithLifecycle()
    val connectForm by connectionViewModel.formState.collectAsStateWithLifecycle()

    val activeCustomer by authViewModel.activeCustomer.collectAsStateWithLifecycle()
    val authFormState by authViewModel.formState.collectAsStateWithLifecycle()

    val homeState by storefrontViewModel.homeState.collectAsStateWithLifecycle()
    val filterState by storefrontViewModel.filterState.collectAsStateWithLifecycle()
    val catalogState by storefrontViewModel.catalogState.collectAsStateWithLifecycle()
    val productDetailState by storefrontViewModel.productDetailState.collectAsStateWithLifecycle()

    val cartItems by cartViewModel.cartItems.collectAsStateWithLifecycle()
    val wishlistItems by cartViewModel.wishlistItems.collectAsStateWithLifecycle()
    val wishlistIds by cartViewModel.wishlistIds.collectAsStateWithLifecycle()
    val couponState by cartViewModel.couponState.collectAsStateWithLifecycle()
    val checkoutForm by cartViewModel.checkoutForm.collectAsStateWithLifecycle()
    val ordersState by cartViewModel.ordersState.collectAsStateWithLifecycle()
    val snackbarMessage by cartViewModel.snackbarMessage.collectAsStateWithLifecycle()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            cartViewModel.consumeSnackbar()
        }
    }

    MercatoTheme(themeMode = themeMode) {
        when (val state = storeState) {
            ActiveStoreState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            ActiveStoreState.Disconnected -> {
                ConnectStoreScreen(
                    formState = connectForm,
                    savedStores = savedStores,
                    canNavigateBack = false,
                    onBack = {},
                    onUrlChange = connectionViewModel::onStoreUrlChange,
                    onKeyChange = connectionViewModel::onConsumerKeyChange,
                    onSecretChange = connectionViewModel::onConsumerSecretChange,
                    onCustomNameChange = connectionViewModel::onCustomNameChange,
                    onConnectClick = { connectionViewModel.connectStore() },
                    onSelectSavedStore = { store -> connectionViewModel.switchStore(store.storeUrl) },
                    onRemoveSavedStore = connectionViewModel::removeSavedStore
                )
            }
            is ActiveStoreState.Connected -> {
                ConnectedStoreShell(
                    storeConfig = state.config,
                    connectionViewModel = connectionViewModel,
                    storefrontViewModel = storefrontViewModel,
                    cartViewModel = cartViewModel,
                    authViewModel = authViewModel,
                    activeCustomer = activeCustomer,
                    authFormState = authFormState,
                    connectForm = connectForm,
                    savedStores = savedStores,
                    themeMode = themeMode,
                    hideDemoControls = hideDemoControls,
                    homeState = homeState,
                    filterState = filterState,
                    catalogState = catalogState,
                    productDetailState = productDetailState,
                    cartItems = cartItems,
                    wishlistItems = wishlistItems,
                    wishlistIds = wishlistIds,
                    couponState = couponState,
                    checkoutForm = checkoutForm,
                    ordersState = ordersState,
                    snackbarHostState = snackbarHostState
                )
            }
        }
    }
}

@Composable
private fun ConnectedStoreShell(
    storeConfig: StoreConfig,
    connectionViewModel: StoreConnectionViewModel,
    storefrontViewModel: StorefrontViewModel,
    cartViewModel: CartCheckoutViewModel,
    authViewModel: AuthViewModel,
    activeCustomer: CustomerSession?,
    authFormState: com.example.ui.viewmodel.AuthFormState,
    connectForm: com.example.ui.viewmodel.ConnectFormState,
    savedStores: List<StoreConfig>,
    themeMode: com.example.ui.theme.ThemeMode,
    hideDemoControls: Boolean,
    homeState: com.example.ui.viewmodel.HomeUiState,
    filterState: com.example.ui.viewmodel.CatalogFilterState,
    catalogState: com.example.ui.viewmodel.CatalogUiState,
    productDetailState: com.example.ui.viewmodel.ProductDetailUiState,
    cartItems: List<com.example.data.local.CartItemEntity>,
    wishlistItems: List<com.example.data.local.WishlistItemEntity>,
    wishlistIds: Set<Long>,
    couponState: com.example.ui.viewmodel.CartCouponState,
    checkoutForm: com.example.ui.viewmodel.CheckoutFormState,
    ordersState: com.example.ui.viewmodel.OrdersUiState,
    snackbarHostState: SnackbarHostState
) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination
    val scope = rememberCoroutineScope()

    val showDemoStoreControls = BuildConfig.SHOW_STORE_SETUP && !hideDemoControls

    val destinations = remember {
        listOf(
            TopLevelDestination(
                route = HomeRoute,
                labelRes = R.string.nav_home,
                selectedIcon = Icons.Filled.Home,
                unselectedIcon = Icons.Outlined.Home,
                testTag = "nav_home",
                matchClass = HomeRoute::class.java
            ),
            TopLevelDestination(
                route = ExploreRoute(),
                labelRes = R.string.nav_explore,
                selectedIcon = Icons.Filled.Explore,
                unselectedIcon = Icons.Outlined.Explore,
                testTag = "nav_explore",
                matchClass = ExploreRoute::class.java
            ),
            TopLevelDestination(
                route = WishlistRoute,
                labelRes = R.string.nav_saved,
                selectedIcon = Icons.Filled.Favorite,
                unselectedIcon = Icons.Outlined.FavoriteBorder,
                testTag = "nav_saved",
                matchClass = WishlistRoute::class.java
            ),
            TopLevelDestination(
                route = CartRoute,
                labelRes = R.string.nav_bag,
                selectedIcon = Icons.Filled.ShoppingBag,
                unselectedIcon = Icons.Outlined.ShoppingBag,
                testTag = "nav_bag",
                matchClass = CartRoute::class.java
            ),
            TopLevelDestination(
                route = OrdersAndStoreRoute,
                labelRes = R.string.nav_store,
                selectedIcon = Icons.Filled.Person,
                unselectedIcon = Icons.Outlined.Person,
                testTag = "nav_orders",
                matchClass = OrdersAndStoreRoute::class.java
            )
        )
    }

    val isTopLevel = currentDestination?.let { dest ->
        dest.hasRoute<HomeRoute>() ||
            dest.hasRoute<ExploreRoute>() ||
            dest.hasRoute<WishlistRoute>() ||
            dest.hasRoute<CartRoute>() ||
            dest.hasRoute<OrdersAndStoreRoute>()
    } ?: true

    val cartBadgeCount = cartItems.sumOf { it.quantity }
    val wishlistCount = wishlistItems.size

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val useNavRail = maxWidth >= 600.dp

        Scaffold(
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
            contentWindowInsets = WindowInsets(0),
            bottomBar = {
                if (isTopLevel && !useNavRail) {
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.surface,
                        windowInsets = WindowInsets.navigationBars
                    ) {
                        destinations.forEach { dest ->
                            val selected = currentDestination?.hasRoute(dest.matchClass.kotlin) == true
                            NavigationBarItem(
                                selected = selected,
                                onClick = {
                                    if (dest.route is ExploreRoute) {
                                        storefrontViewModel.applyExploreNavigationFilter(null, null, false)
                                    }
                                    if (dest.route is OrdersAndStoreRoute) {
                                        cartViewModel.loadOrders()
                                    }
                                    navController.navigate(dest.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    NavIconWithBadge(
                                        dest = dest,
                                        selected = selected,
                                        cartBadgeCount = cartBadgeCount,
                                        wishlistCount = wishlistCount
                                    )
                                },
                                label = { Text(stringResource(dest.labelRes)) },
                                modifier = Modifier.testTag(dest.testTag)
                            )
                        }
                    }
                }
            }
        ) { innerPadding ->
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (isTopLevel && useNavRail) {
                    NavigationRail(
                        containerColor = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.windowInsetsPadding(WindowInsets.statusBars)
                    ) {
                        destinations.forEach { dest ->
                            val selected = currentDestination?.hasRoute(dest.matchClass.kotlin) == true
                            NavigationRailItem(
                                selected = selected,
                                onClick = {
                                    if (dest.route is ExploreRoute) {
                                        storefrontViewModel.applyExploreNavigationFilter(null, null, false)
                                    }
                                    if (dest.route is OrdersAndStoreRoute) {
                                        cartViewModel.loadOrders()
                                    }
                                    navController.navigate(dest.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    NavIconWithBadge(
                                        dest = dest,
                                        selected = selected,
                                        cartBadgeCount = cartBadgeCount,
                                        wishlistCount = wishlistCount
                                    )
                                },
                                label = { Text(stringResource(dest.labelRes)) },
                                modifier = Modifier.testTag(dest.testTag)
                            )
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxSize()
                        .let { mod ->
                            if (isTopLevel) mod.windowInsetsPadding(WindowInsets.statusBars) else mod
                        }
                ) {
                    NavHost(
                        navController = navController,
                        startDestination = HomeRoute
                    ) {
                        composable<HomeRoute> {
                            HomeScreen(
                                storeConfig = storeConfig,
                                homeState = homeState,
                                wishlistIds = wishlistIds,
                                showDemoStoreControls = showDemoStoreControls,
                                onRefresh = { storefrontViewModel.loadHomeFeed(refresh = true) },
                                onOpenSearch = {
                                    storefrontViewModel.applyExploreNavigationFilter(null, null, false)
                                    navController.navigate(ExploreRoute()) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                    }
                                },
                                onOpenCategory = { catId, catName ->
                                    storefrontViewModel.applyExploreNavigationFilter(catId, catName, false)
                                    navController.navigate(ExploreRoute(catId, catName, false)) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                    }
                                },
                                onOpenDeals = {
                                    storefrontViewModel.applyExploreNavigationFilter(null, null, true)
                                    navController.navigate(ExploreRoute(onSaleOnly = true)) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                    }
                                },
                                onProductClick = { productId ->
                                    storefrontViewModel.loadProductDetail(productId)
                                    navController.navigate(ProductDetailRoute(productId))
                                },
                                onToggleWishlist = cartViewModel::toggleWishlist,
                                onQuickAdd = { product -> cartViewModel.addToCart(product) },
                                onSwitchStore = {
                                    connectionViewModel.clearForm()
                                    navController.navigate(ConnectStoreRoute)
                                }
                            )
                        }

                        composable<ExploreRoute> {
                            ExploreScreen(
                                storeConfig = storeConfig,
                                filterState = filterState,
                                catalogState = catalogState,
                                wishlistIds = wishlistIds,
                                onSearchQueryChange = storefrontViewModel::onSearchQueryChanged,
                                onSelectCategory = { catId, catName ->
                                    storefrontViewModel.updateFilters(
                                        categoryId = catId,
                                        categoryName = catName
                                    )
                                },
                                onApplyFilters = { sort, onSale, inStock, minP, maxP ->
                                    storefrontViewModel.updateFilters(
                                        sortOption = sort,
                                        onSaleOnly = onSale,
                                        inStockOnly = inStock,
                                        minPrice = minP,
                                        maxPrice = maxP
                                    )
                                },
                                onClearFilters = storefrontViewModel::clearAllFilters,
                                onLoadNextPage = storefrontViewModel::loadNextCatalogPage,
                                onRetry = { storefrontViewModel.loadCatalogPage(page = 1, append = false) },
                                onProductClick = { productId ->
                                    storefrontViewModel.loadProductDetail(productId)
                                    navController.navigate(ProductDetailRoute(productId))
                                },
                                onToggleWishlist = cartViewModel::toggleWishlist,
                                onQuickAdd = { product -> cartViewModel.addToCart(product) }
                            )
                        }

                        composable<WishlistRoute> {
                            WishlistScreen(
                                storeConfig = storeConfig,
                                items = wishlistItems,
                                onProductClick = { productId ->
                                    storefrontViewModel.loadProductDetail(productId)
                                    navController.navigate(ProductDetailRoute(productId))
                                },
                                onMoveToCart = cartViewModel::addWishlistItemToCart,
                                onRemove = cartViewModel::removeFromWishlist,
                                onBrowseCatalog = {
                                    navController.navigate(ExploreRoute()) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                    }
                                }
                            )
                        }

                        composable<CartRoute> {
                            val subtotal = cartItems.sumOf { it.price * it.quantity }
                            val discount = cartViewModel.calculateDiscount(subtotal)
                            CartScreen(
                                storeConfig = storeConfig,
                                items = cartItems,
                                couponState = couponState,
                                discountAmount = discount,
                                onProductClick = { productId ->
                                    storefrontViewModel.loadProductDetail(productId)
                                    navController.navigate(ProductDetailRoute(productId))
                                },
                                onUpdateQuantity = cartViewModel::updateCartQuantity,
                                onRemoveItem = cartViewModel::removeCartItem,
                                onCouponInputChange = cartViewModel::onCouponInputChange,
                                onApplyCoupon = cartViewModel::applyCoupon,
                                onRemoveCoupon = cartViewModel::removeCoupon,
                                onProceedToCheckout = {
                                    cartViewModel.prepareCheckout()
                                    navController.navigate(CheckoutRoute)
                                },
                                onBrowseCatalog = {
                                    navController.navigate(ExploreRoute()) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                    }
                                }
                            )
                        }

                        composable<OrdersAndStoreRoute> {
                            OrdersAndStoreScreen(
                                storeConfig = storeConfig,
                                activeCustomer = activeCustomer,
                                authFormState = authFormState,
                                themeMode = themeMode,
                                hideDemoControls = hideDemoControls,
                                ordersState = ordersState,
                                onToggleAuthMode = authViewModel::toggleAuthMode,
                                onUpdateAuthForm = authViewModel::updateForm,
                                onSubmitLogin = {
                                    authViewModel.submitLogin {
                                        cartViewModel.loadOrders()
                                    }
                                },
                                onSubmitRegister = {
                                    authViewModel.submitRegistration {
                                        cartViewModel.loadOrders()
                                    }
                                },
                                onUpdateCustomerProfile = authViewModel::updateProfile,
                                onLogoutCustomer = {
                                    authViewModel.logout()
                                    cartViewModel.loadOrders()
                                },
                                onRefreshOrders = cartViewModel::loadOrders,
                                onLookupOrder = cartViewModel::lookupOrderById,
                                onThemeModeChange = connectionViewModel::setThemeMode,
                                onSetHideDemoControls = connectionViewModel::setHideDemoControls,
                                onRefreshStoreInfo = connectionViewModel::refreshActiveStoreInfo,
                                onSwitchOrAddStore = {
                                    connectionViewModel.clearForm()
                                    navController.navigate(ConnectStoreRoute)
                                },
                                onDisconnectStore = connectionViewModel::disconnectStore
                            )
                        }

                        composable<ProductDetailRoute> { entry ->
                            val route = entry.toRoute<ProductDetailRoute>()
                            ProductDetailScreen(
                                storeConfig = storeConfig,
                                detailState = productDetailState,
                                wishlistIds = wishlistIds,
                                activeCustomer = activeCustomer,
                                onBack = { navController.popBackStack() },
                                onRetry = { storefrontViewModel.loadProductDetail(route.productId) },
                                onSelectAttribute = storefrontViewModel::selectProductAttribute,
                                onToggleWishlist = cartViewModel::toggleWishlist,
                                onAddToCart = { product, variation, qty ->
                                    cartViewModel.addToCart(product, variation, qty)
                                },
                                onSubmitReview = { prodId, name, email, stars, text, cb ->
                                    storefrontViewModel.submitProductReview(prodId, name, email, stars, text) { ok, msg ->
                                        cb(ok, msg)
                                        if (ok) {
                                            scope.launch { snackbarHostState.showSnackbar(msg) }
                                        }
                                    }
                                },
                                onProductClick = { relatedId ->
                                    storefrontViewModel.loadProductDetail(relatedId)
                                    navController.navigate(ProductDetailRoute(relatedId))
                                }
                            )
                        }

                        composable<CheckoutRoute> {
                            val subtotal = cartItems.sumOf { it.price * it.quantity }
                            val discount = cartViewModel.calculateDiscount(subtotal)
                            CheckoutScreen(
                                storeConfig = storeConfig,
                                cartItems = cartItems,
                                discountAmount = discount,
                                formState = checkoutForm,
                                onBack = { navController.popBackStack() },
                                onUpdateForm = cartViewModel::updateCheckoutForm,
                                onPlaceOrder = cartViewModel::placeOrder,
                                onOrderDone = {
                                    cartViewModel.resetCheckoutResult()
                                    navController.navigate(OrdersAndStoreRoute) {
                                        popUpTo(HomeRoute)
                                        launchSingleTop = true
                                    }
                                }
                            )
                        }

                        composable<ConnectStoreRoute> {
                            ConnectStoreScreen(
                                formState = connectForm,
                                savedStores = savedStores,
                                canNavigateBack = true,
                                onBack = { navController.popBackStack() },
                                onUrlChange = connectionViewModel::onStoreUrlChange,
                                onKeyChange = connectionViewModel::onConsumerKeyChange,
                                onSecretChange = connectionViewModel::onConsumerSecretChange,
                                onCustomNameChange = connectionViewModel::onCustomNameChange,
                                onConnectClick = {
                                    connectionViewModel.connectStore {
                                        navController.navigate(HomeRoute) {
                                            popUpTo(HomeRoute) { inclusive = true }
                                        }
                                    }
                                },
                                onSelectSavedStore = { store ->
                                    connectionViewModel.switchStore(store.storeUrl) {
                                        navController.navigate(HomeRoute) {
                                            popUpTo(HomeRoute) { inclusive = true }
                                        }
                                    }
                                },
                                onRemoveSavedStore = connectionViewModel::removeSavedStore
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NavIconWithBadge(
    dest: TopLevelDestination,
    selected: Boolean,
    cartBadgeCount: Int,
    wishlistCount: Int
) {
    val icon = if (selected) dest.selectedIcon else dest.unselectedIcon
    val badgeCount = when (dest.matchClass) {
        CartRoute::class.java -> cartBadgeCount
        WishlistRoute::class.java -> wishlistCount
        else -> 0
    }
    if (badgeCount > 0) {
        BadgedBox(
            badge = {
                Badge(containerColor = MaterialTheme.colorScheme.secondary) {
                    Text(if (badgeCount > 99) "99+" else badgeCount.toString())
                }
            }
        ) {
            Icon(imageVector = icon, contentDescription = stringResource(dest.labelRes))
        }
    } else {
        Icon(imageVector = icon, contentDescription = stringResource(dest.labelRes))
    }
}
