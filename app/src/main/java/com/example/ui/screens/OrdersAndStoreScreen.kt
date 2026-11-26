package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PowerSettingsNew
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.example.BuildConfig
import com.example.data.model.CustomerAddress
import com.example.data.model.CustomerSession
import com.example.data.model.StoreConfig
import com.example.data.model.WooOrderResponse
import com.example.ui.components.StoreErrorCard
import com.example.ui.theme.JetBrainsMonoFontFamily
import com.example.ui.theme.ThemeMode
import com.example.ui.viewmodel.AuthActionState
import com.example.ui.viewmodel.AuthFormState
import com.example.ui.viewmodel.OrdersUiState
import com.example.util.PriceFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersAndStoreScreen(
    storeConfig: StoreConfig,
    activeCustomer: CustomerSession?,
    authFormState: AuthFormState,
    themeMode: ThemeMode,
    hideDemoControls: Boolean,
    ordersState: OrdersUiState,
    onToggleAuthMode: (Boolean) -> Unit,
    onUpdateAuthForm: ((AuthFormState) -> AuthFormState) -> Unit,
    onSubmitLogin: () -> Unit,
    onSubmitRegister: () -> Unit,
    onUpdateCustomerProfile: (String, String, CustomerAddress, (Boolean, String) -> Unit) -> Unit,
    onLogoutCustomer: () -> Unit,
    onRefreshOrders: () -> Unit,
    onLookupOrder: (String) -> Unit,
    onThemeModeChange: (ThemeMode) -> Unit,
    onSetHideDemoControls: (Boolean) -> Unit,
    onRefreshStoreInfo: () -> Unit,
    onSwitchOrAddStore: () -> Unit,
    onDisconnectStore: () -> Unit
) {
    var orderLookupQuery by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var showEditProfileSheet by remember { mutableStateOf(false) }
    var selectedOrderForDetail by remember { mutableStateOf<WooOrderResponse?>(null) }
    var showWpAuthHelp by remember { mutableStateOf(false) }

    val showStoreAdminSection = BuildConfig.SHOW_STORE_SETUP && !hideDemoControls

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Account & Orders",
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }

        // WordPress + WooCommerce Customer Auth / Profile Section
        item {
            if (activeCustomer == null) {
                Surface(
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (authFormState.isRegisterMode) "Create Customer Account" else "WordPress Sign In",
                                    style = MaterialTheme.typography.titleLarge
                                )
                                Text(
                                    text = "Sync profile, saved address & orders with ${storeConfig.storeName}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            IconButton(onClick = { showWpAuthHelp = true }) {
                                Icon(
                                    imageVector = Icons.Outlined.HelpOutline,
                                    contentDescription = "WordPress login guide"
                                )
                            }
                        }

                        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                            SegmentedButton(
                                selected = !authFormState.isRegisterMode,
                                onClick = { onToggleAuthMode(false) },
                                shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                                modifier = Modifier.testTag("auth_mode_login")
                            ) {
                                Text("Sign In")
                            }
                            SegmentedButton(
                                selected = authFormState.isRegisterMode,
                                onClick = { onToggleAuthMode(true) },
                                shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                                modifier = Modifier.testTag("auth_mode_register")
                            ) {
                                Text("Register")
                            }
                        }

                        if (authFormState.isRegisterMode) {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(
                                    value = authFormState.firstName,
                                    onValueChange = { v -> onUpdateAuthForm { it.copy(firstName = v) } },
                                    label = { Text("First Name *") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f).testTag("register_first_name")
                                )
                                OutlinedTextField(
                                    value = authFormState.lastName,
                                    onValueChange = { v -> onUpdateAuthForm { it.copy(lastName = v) } },
                                    label = { Text("Last Name") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f).testTag("register_last_name")
                                )
                            }
                            OutlinedTextField(
                                value = authFormState.email,
                                onValueChange = { v -> onUpdateAuthForm { it.copy(email = v) } },
                                label = { Text("Email Address *") },
                                leadingIcon = { Icon(Icons.Outlined.MailOutline, contentDescription = null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth().testTag("register_email")
                            )
                            OutlinedTextField(
                                value = authFormState.username,
                                onValueChange = { v -> onUpdateAuthForm { it.copy(username = v) } },
                                label = { Text("Username (optional)") },
                                leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth().testTag("register_username")
                            )
                        } else {
                            OutlinedTextField(
                                value = authFormState.identifier,
                                onValueChange = { v -> onUpdateAuthForm { it.copy(identifier = v) } },
                                label = { Text("WordPress Email or Username") },
                                leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth().testTag("login_identifier")
                            )
                        }

                        OutlinedTextField(
                            value = authFormState.password,
                            onValueChange = { v -> onUpdateAuthForm { it.copy(password = v) } },
                            label = { Text("Password") },
                            leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { showPassword = !showPassword }) {
                                    Icon(
                                        imageVector = if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                        contentDescription = if (showPassword) "Hide password" else "Show password"
                                    )
                                }
                            },
                            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("auth_password")
                        )

                        AnimatedVisibility(visible = authFormState.actionState is AuthActionState.Error) {
                            val msg = (authFormState.actionState as? AuthActionState.Error)?.message.orEmpty()
                            Surface(
                                color = MaterialTheme.colorScheme.errorContainer,
                                shape = MaterialTheme.shapes.small
                            ) {
                                Text(
                                    text = msg,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.fillMaxWidth().padding(12.dp)
                                )
                            }
                        }

                        val isLoading = authFormState.actionState is AuthActionState.Loading
                        Button(
                            onClick = {
                                if (authFormState.isRegisterMode) onSubmitRegister() else onSubmitLogin()
                            },
                            enabled = !isLoading,
                            shape = RoundedCornerShape(50),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .testTag("auth_submit_button")
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(if (authFormState.isRegisterMode) "Creating Account…" else "Signing In…")
                            } else {
                                Text(if (authFormState.isRegisterMode) "Create WooCommerce Account" else "Sign In")
                            }
                        }
                    }
                }
            } else {
                // Logged-in Customer Profile Card
                Surface(
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.size(52.dp)
                            ) {
                                if (activeCustomer.avatarUrl.isNotBlank()) {
                                    SubcomposeAsyncImage(
                                        model = activeCustomer.avatarUrl,
                                        contentDescription = activeCustomer.fullName,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = activeCustomer.fullName.take(1).uppercase(),
                                            style = MaterialTheme.typography.titleLarge,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                    }
                                }
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = activeCustomer.fullName,
                                    style = MaterialTheme.typography.titleLarge
                                )
                                Text(
                                    text = activeCustomer.email,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    text = "Customer #${activeCustomer.customerId} • @${activeCustomer.username}",
                                    style = MaterialTheme.typography.labelSmall.copy(fontFamily = JetBrainsMonoFontFamily),
                                    color = MaterialTheme.colorScheme.tertiary
                                )
                            }
                        }

                        if (activeCustomer.billing.address1.isNotBlank()) {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = MaterialTheme.shapes.small,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = buildString {
                                        append("Saved Address: ")
                                        append(activeCustomer.billing.address1)
                                        if (activeCustomer.billing.city.isNotBlank()) append(", ${activeCustomer.billing.city}")
                                        if (activeCustomer.billing.postcode.isNotBlank()) append(" ${activeCustomer.billing.postcode}")
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { showEditProfileSheet = true },
                                modifier = Modifier.weight(1f).testTag("edit_profile_button"),
                                shape = MaterialTheme.shapes.small
                            ) {
                                Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Edit Profile & Address")
                            }
                            OutlinedButton(
                                onClick = onLogoutCustomer,
                                modifier = Modifier.testTag("logout_customer_button"),
                                shape = MaterialTheme.shapes.small
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Outlined.Logout,
                                    contentDescription = "Sign out",
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Track / Customer Orders Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (activeCustomer != null) "My Orders" else "Order History & Tracking",
                    style = MaterialTheme.typography.titleLarge
                )
                IconButton(onClick = onRefreshOrders) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Refresh orders")
                }
            }
        }

        item {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = orderLookupQuery,
                    onValueChange = { orderLookupQuery = it },
                    placeholder = { Text("Track by Order ID (e.g. 1042)") },
                    leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f).testTag("order_lookup_input"),
                    shape = MaterialTheme.shapes.small
                )
                OutlinedButton(
                    onClick = { onLookupOrder(orderLookupQuery) },
                    enabled = orderLookupQuery.isNotBlank(),
                    modifier = Modifier.height(54.dp),
                    shape = MaterialTheme.shapes.small
                ) {
                    Text("Track")
                }
            }
        }

        when (ordersState) {
            OrdersUiState.Loading -> {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
            }
            is OrdersUiState.Error -> {
                item {
                    StoreErrorCard(message = ordersState.message, onRetry = onRefreshOrders)
                }
            }
            is OrdersUiState.Success -> {
                if (ordersState.orders.isEmpty()) {
                    item {
                        Surface(
                            shape = MaterialTheme.shapes.large,
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.ReceiptLong,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(36.dp)
                                )
                                Text("No orders found yet", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    text = if (activeCustomer != null) {
                                        "Orders placed with your account will sync automatically from WooCommerce."
                                    } else {
                                        "Sign in to sync your order history or track any order by ID above."
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                } else {
                    items(ordersState.orders, key = { it.id }) { order ->
                        Surface(
                            shape = MaterialTheme.shapes.medium,
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(MaterialTheme.shapes.medium)
                                .clickable { selectedOrderForDetail = order }
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Order #${order.number.ifBlank { order.id.toString() }}",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontFamily = JetBrainsMonoFontFamily,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                    Surface(
                                        color = when (order.status.lowercase()) {
                                            "completed" -> MaterialTheme.colorScheme.tertiaryContainer
                                            "cancelled", "failed", "refunded" -> MaterialTheme.colorScheme.errorContainer
                                            else -> MaterialTheme.colorScheme.secondaryContainer
                                        },
                                        shape = RoundedCornerShape(50)
                                    ) {
                                        Text(
                                            text = order.status.replaceFirstChar { it.uppercase() },
                                            style = MaterialTheme.typography.labelSmall,
                                            color = when (order.status.lowercase()) {
                                                "completed" -> MaterialTheme.colorScheme.onTertiaryContainer
                                                "cancelled", "failed", "refunded" -> MaterialTheme.colorScheme.onErrorContainer
                                                else -> MaterialTheme.colorScheme.onSecondaryContainer
                                            },
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                val summary = order.lineItems.joinToString(", ") { "${it.quantity}x ${it.name}" }
                                if (summary.isNotBlank()) {
                                    Text(
                                        text = summary,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = order.dateCreated.substringBefore("T"),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = PriceFormatter.formatRaw(order.total, storeConfig.currencySymbol),
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontFamily = JetBrainsMonoFontFamily,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Appearance Settings (Always Available)
        item {
            Surface(
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Appearance",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ThemeMode.entries.forEach { mode ->
                            FilterChip(
                                selected = themeMode == mode,
                                onClick = { onThemeModeChange(mode) },
                                label = { Text(mode.label) }
                            )
                        }
                    }
                    if (BuildConfig.SHOW_STORE_SETUP) {
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Hide Demo Store Settings",
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text(
                                    text = "Preview production mode (release builds hide this automatically).",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Switch(
                                checked = hideDemoControls,
                                onCheckedChange = onSetHideDemoControls,
                                modifier = Modifier.testTag("toggle_hide_demo")
                            )
                        }
                    }
                }
            }
        }

        // Demo-Only WooCommerce Store Connection Controls (hidden in production / when toggled)
        if (showStoreAdminSection) {
            item {
                Surface(
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Storefront,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(10.dp)
                                    )
                                }
                                Column {
                                    Text(
                                        text = storeConfig.storeName,
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Text(
                                        text = storeConfig.storeUrl,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Surface(
                                color = MaterialTheme.colorScheme.secondaryContainer,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = "DEMO CONFIG",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = onSwitchOrAddStore,
                                modifier = Modifier.weight(1f).testTag("switch_add_store_button"),
                                shape = MaterialTheme.shapes.small
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.SwapHoriz,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Switch / Edit API Keys")
                            }
                            OutlinedButton(
                                onClick = onRefreshStoreInfo,
                                shape = MaterialTheme.shapes.small
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.Refresh,
                                    contentDescription = "Sync store",
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        TextButton(
                            onClick = onDisconnectStore,
                            modifier = Modifier.testTag("disconnect_store_button")
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.PowerSettingsNew,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Disconnect Active Store",
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }
        }
    }

    // Edit Profile & Shipping Address Sheet
    if (showEditProfileSheet && activeCustomer != null) {
        var first by remember(activeCustomer) { mutableStateOf(activeCustomer.firstName) }
        var last by remember(activeCustomer) { mutableStateOf(activeCustomer.lastName) }
        var phone by remember(activeCustomer) { mutableStateOf(activeCustomer.billing.phone) }
        var addr by remember(activeCustomer) { mutableStateOf(activeCustomer.billing.address1) }
        var city by remember(activeCustomer) { mutableStateOf(activeCustomer.billing.city) }
        var state by remember(activeCustomer) { mutableStateOf(activeCustomer.billing.state) }
        var postcode by remember(activeCustomer) { mutableStateOf(activeCustomer.billing.postcode) }
        var country by remember(activeCustomer) { mutableStateOf(activeCustomer.billing.country) }
        var saving by remember { mutableStateOf(false) }
        var errorMsg by remember { mutableStateOf<String?>(null) }

        ModalBottomSheet(
            onDismissRequest = { showEditProfileSheet = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Edit Profile & Address", style = MaterialTheme.typography.headlineSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = first,
                        onValueChange = { first = it },
                        label = { Text("First Name") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = last,
                        onValueChange = { last = it },
                        label = { Text("Last Name") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = addr,
                    onValueChange = { addr = it },
                    label = { Text("Street Address") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = city,
                        onValueChange = { city = it },
                        label = { Text("City") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = state,
                        onValueChange = { state = it },
                        label = { Text("State") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = postcode,
                        onValueChange = { postcode = it },
                        label = { Text("Postal Code") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = country,
                        onValueChange = { country = it },
                        label = { Text("Country") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                errorMsg?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
                Button(
                    onClick = {
                        saving = true
                        errorMsg = null
                        onUpdateCustomerProfile(
                            first,
                            last,
                            CustomerAddress(
                                firstName = first,
                                lastName = last,
                                address1 = addr,
                                city = city,
                                state = state,
                                postcode = postcode,
                                country = country,
                                phone = phone
                            )
                        ) { ok, msg ->
                            saving = false
                            if (ok) showEditProfileSheet = false else errorMsg = msg
                        }
                    },
                    enabled = !saving,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(50)
                ) {
                    Text(if (saving) "Syncing…" else "Save to WooCommerce")
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }

    // Order Detail Modal Sheet
    selectedOrderForDetail?.let { order ->
        ModalBottomSheet(onDismissRequest = { selectedOrderForDetail = null }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Order #${order.number.ifBlank { order.id.toString() }}",
                    style = MaterialTheme.typography.headlineSmall
                )
                Text(
                    text = "Status: ${order.status.replaceFirstChar { it.uppercase() }} • ${order.paymentMethodTitle}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                HorizontalDivider()
                order.lineItems.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("${item.quantity}x ${item.name}", modifier = Modifier.weight(1f))
                        Text(
                            text = PriceFormatter.formatRaw(item.total, storeConfig.currencySymbol),
                            style = MaterialTheme.typography.bodyMedium.copy(fontFamily = JetBrainsMonoFontFamily)
                        )
                    }
                }
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = PriceFormatter.formatRaw(order.total, storeConfig.currencySymbol),
                        style = MaterialTheme.typography.titleLarge.copy(fontFamily = JetBrainsMonoFontFamily)
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
            }
        }
    }

    // WordPress Auth Setup Help Sheet
    if (showWpAuthHelp) {
        ModalBottomSheet(onDismissRequest = { showWpAuthHelp = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("WordPress & WooCommerce Login", style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = "• Registration creates a real WordPress user & WooCommerce customer immediately via /wp-json/wc/v3/customers.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "• Sign In verifies your WordPress password using the 'JWT Authentication for WP REST API' plugin (/wp-json/jwt-auth/v1/token) or WordPress Application Passwords (/wp-json/wp/v2/users/me).",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "• Once signed in, your saved shipping address auto-fills Checkout and all past & future WooCommerce orders sync automatically.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(14.dp))
            }
        }
    }
}
