package com.example.ui.screens

import android.content.Intent
import androidx.core.net.toUri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.local.CartItemEntity
import com.example.data.model.StoreConfig
import com.example.ui.theme.JetBrainsMonoFontFamily
import com.example.ui.viewmodel.CheckoutFormState
import com.example.ui.viewmodel.CheckoutUiState
import com.example.util.HtmlTextParser
import com.example.util.PriceFormatter

@Composable
fun CheckoutScreen(
    storeConfig: StoreConfig,
    cartItems: List<CartItemEntity>,
    discountAmount: Double,
    formState: CheckoutFormState,
    onBack: () -> Unit,
    onUpdateForm: ((CheckoutFormState) -> CheckoutFormState) -> Unit,
    onPlaceOrder: () -> Unit,
    onOrderDone: () -> Unit
) {
    val context = LocalContext.current
    val subtotal = cartItems.sumOf { it.price * it.quantity }
    val total = (subtotal - discountAmount).coerceAtLeast(0.0)

    val orderPlaced = (formState.submitState as? CheckoutUiState.OrderPlaced)?.order
    if (orderPlaced != null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                modifier = Modifier.widthIn(max = 520.dp),
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.tertiaryContainer
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.CheckCircle,
                            contentDescription = "Order confirmed",
                            tint = MaterialTheme.colorScheme.onTertiaryContainer,
                            modifier = Modifier
                                .padding(16.dp)
                                .size(40.dp)
                        )
                    }
                    Text(
                        text = "Order #${orderPlaced.number.ifBlank { orderPlaced.id.toString() }} Confirmed",
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = "Your order has been submitted directly to ${storeConfig.storeName}.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Status", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    text = orderPlaced.status.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Total", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    text = PriceFormatter.formatRaw(orderPlaced.total, storeConfig.currencySymbol),
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontFamily = JetBrainsMonoFontFamily
                                    )
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Payment", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    text = orderPlaced.paymentMethodTitle.ifBlank { orderPlaced.paymentMethod },
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }

                    val paymentUrl = orderPlaced.paymentUrl?.takeIf { it.startsWith("https://", ignoreCase = true) }
                    if (paymentUrl != null) {
                        OutlinedButton(
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, paymentUrl.toUri())
                                runCatching { context.startActivity(intent) }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Complete Online Payment")
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.AutoMirrored.Outlined.OpenInNew,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Button(
                        onClick = onOrderDone,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("order_done_button")
                    ) {
                        Text("View My Orders")
                    }
                }
            }
        }
        return
    }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 8.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.testTag("checkout_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.cd_back)
                        )
                    }
                    Text(
                        text = "Checkout",
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
            }
        },
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (formState.submitState is CheckoutUiState.Error) {
                        Text(
                            text = formState.submitState.message,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                    val isSubmitting = formState.submitState is CheckoutUiState.Submitting
                    Button(
                        onClick = onPlaceOrder,
                        enabled = !isSubmitting && cartItems.isNotEmpty(),
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("place_order_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Submitting Order…")
                        } else {
                            Text(
                                text = "Place Order • ${PriceFormatter.format(total, storeConfig.currencySymbol)}",
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier.widthIn(max = 600.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Contact & Shipping Form
                Surface(
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("Shipping & Contact", style = MaterialTheme.typography.titleLarge)

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = formState.firstName,
                                onValueChange = { v -> onUpdateForm { it.copy(firstName = v) } },
                                label = { Text("First Name *") },
                                singleLine = true,
                                modifier = Modifier.weight(1f).testTag("checkout_first_name")
                            )
                            OutlinedTextField(
                                value = formState.lastName,
                                onValueChange = { v -> onUpdateForm { it.copy(lastName = v) } },
                                label = { Text("Last Name *") },
                                singleLine = true,
                                modifier = Modifier.weight(1f).testTag("checkout_last_name")
                            )
                        }

                        OutlinedTextField(
                            value = formState.email,
                            onValueChange = { v -> onUpdateForm { it.copy(email = v) } },
                            label = { Text("Email Address *") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("checkout_email")
                        )

                        OutlinedTextField(
                            value = formState.phone,
                            onValueChange = { v -> onUpdateForm { it.copy(phone = v) } },
                            label = { Text("Phone") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = formState.address1,
                            onValueChange = { v -> onUpdateForm { it.copy(address1 = v) } },
                            label = { Text("Street Address *") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("checkout_address")
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = formState.city,
                                onValueChange = { v -> onUpdateForm { it.copy(city = v) } },
                                label = { Text("City *") },
                                singleLine = true,
                                modifier = Modifier.weight(1f).testTag("checkout_city")
                            )
                            OutlinedTextField(
                                value = formState.state,
                                onValueChange = { v -> onUpdateForm { it.copy(state = v) } },
                                label = { Text("State") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = formState.postcode,
                                onValueChange = { v -> onUpdateForm { it.copy(postcode = v) } },
                                label = { Text("Postal Code *") },
                                singleLine = true,
                                modifier = Modifier.weight(1f).testTag("checkout_postcode")
                            )
                            OutlinedTextField(
                                value = formState.country,
                                onValueChange = { v -> onUpdateForm { it.copy(country = v) } },
                                label = { Text("Country (ISO)") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        OutlinedTextField(
                            value = formState.customerNote,
                            onValueChange = { v -> onUpdateForm { it.copy(customerNote = v) } },
                            label = { Text("Order Notes (optional)") },
                            maxLines = 3,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Payment Methods from WooCommerce Store
                Surface(
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("Payment Method", style = MaterialTheme.typography.titleLarge)
                        if (formState.isLoadingGateways) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        } else {
                            formState.gateways.forEach { gateway ->
                                val selected = gateway.id == formState.selectedGatewayId
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(MaterialTheme.shapes.small)
                                        .clickable {
                                            onUpdateForm { it.copy(selectedGatewayId = gateway.id) }
                                        }
                                        .padding(vertical = 6.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    RadioButton(
                                        selected = selected,
                                        onClick = {
                                            onUpdateForm { it.copy(selectedGatewayId = gateway.id) }
                                        }
                                    )
                                    Column(modifier = Modifier.padding(top = 6.dp)) {
                                        Text(
                                            text = HtmlTextParser.decodeEntities(gateway.title).ifBlank { gateway.id },
                                            style = MaterialTheme.typography.titleMedium
                                        )
                                        val desc = HtmlTextParser.toPlainText(gateway.description)
                                        if (desc.isNotBlank()) {
                                            Text(
                                                text = desc,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Order Review
                Surface(
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Order Summary", style = MaterialTheme.typography.titleLarge)
                        cartItems.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${item.quantity}x ${item.name}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = PriceFormatter.format(item.price * item.quantity, storeConfig.currencySymbol),
                                    style = MaterialTheme.typography.bodyMedium.copy(fontFamily = JetBrainsMonoFontFamily)
                                )
                            }
                        }
                        if (discountAmount > 0.0) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Coupon Discount",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.tertiary
                                )
                                Text(
                                    text = "-${PriceFormatter.format(discountAmount, storeConfig.currencySymbol)}",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontFamily = JetBrainsMonoFontFamily),
                                    color = MaterialTheme.colorScheme.tertiary
                                )
                            }
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total", style = MaterialTheme.typography.titleLarge)
                            Text(
                                text = PriceFormatter.format(total, storeConfig.currencySymbol),
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontFamily = JetBrainsMonoFontFamily,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}
