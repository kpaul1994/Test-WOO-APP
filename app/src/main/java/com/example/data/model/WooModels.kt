package com.example.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class WordPressRootInfo(
    @Json(name = "name") val name: String? = null,
    @Json(name = "description") val description: String? = null,
    @Json(name = "url") val url: String? = null
)

@JsonClass(generateAdapter = true)
data class WooCurrency(
    @Json(name = "code") val code: String = "USD",
    @Json(name = "name") val name: String = "United States dollar",
    @Json(name = "symbol") val symbol: String = "$"
)

@JsonClass(generateAdapter = true)
data class WooProduct(
    @Json(name = "id") val id: Long,
    @Json(name = "name") val name: String = "",
    @Json(name = "slug") val slug: String = "",
    @Json(name = "permalink") val permalink: String = "",
    @Json(name = "type") val type: String = "simple",
    @Json(name = "status") val status: String = "publish",
    @Json(name = "featured") val featured: Boolean = false,
    @Json(name = "description") val description: String = "",
    @Json(name = "short_description") val shortDescription: String = "",
    @Json(name = "sku") val sku: String = "",
    @Json(name = "price") val price: String = "",
    @Json(name = "regular_price") val regularPrice: String = "",
    @Json(name = "sale_price") val salePrice: String = "",
    @Json(name = "on_sale") val onSale: Boolean = false,
    @Json(name = "purchasable") val purchasable: Boolean = true,
    @Json(name = "total_sales") val totalSales: Int = 0,
    @Json(name = "manage_stock") val manageStock: Boolean = false,
    @Json(name = "stock_quantity") val stockQuantity: Int? = null,
    @Json(name = "stock_status") val stockStatus: String = "instock",
    @Json(name = "average_rating") val averageRating: String = "0.00",
    @Json(name = "rating_count") val ratingCount: Int = 0,
    @Json(name = "categories") val categories: List<WooCategoryRef> = emptyList(),
    @Json(name = "images") val images: List<WooProductImage> = emptyList(),
    @Json(name = "attributes") val attributes: List<WooProductAttribute> = emptyList(),
    @Json(name = "variations") val variations: List<Long> = emptyList(),
    @Json(name = "related_ids") val relatedIds: List<Long> = emptyList()
)

@JsonClass(generateAdapter = true)
data class WooCategoryRef(
    @Json(name = "id") val id: Long,
    @Json(name = "name") val name: String = "",
    @Json(name = "slug") val slug: String = ""
)

@JsonClass(generateAdapter = true)
data class WooProductImage(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "src") val src: String = "",
    @Json(name = "name") val name: String = "",
    @Json(name = "alt") val alt: String = ""
)

@JsonClass(generateAdapter = true)
data class WooProductCategory(
    @Json(name = "id") val id: Long,
    @Json(name = "name") val name: String = "",
    @Json(name = "slug") val slug: String = "",
    @Json(name = "parent") val parent: Long = 0,
    @Json(name = "description") val description: String = "",
    @Json(name = "image") val image: WooProductImage? = null,
    @Json(name = "count") val count: Int = 0
)

@JsonClass(generateAdapter = true)
data class WooProductAttribute(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "name") val name: String = "",
    @Json(name = "position") val position: Int = 0,
    @Json(name = "visible") val visible: Boolean = true,
    @Json(name = "variation") val variation: Boolean = false,
    @Json(name = "options") val options: List<String> = emptyList()
)

@JsonClass(generateAdapter = true)
data class WooProductVariation(
    @Json(name = "id") val id: Long,
    @Json(name = "description") val description: String = "",
    @Json(name = "sku") val sku: String = "",
    @Json(name = "price") val price: String = "",
    @Json(name = "regular_price") val regularPrice: String = "",
    @Json(name = "sale_price") val salePrice: String = "",
    @Json(name = "on_sale") val onSale: Boolean = false,
    @Json(name = "purchasable") val purchasable: Boolean = true,
    @Json(name = "stock_status") val stockStatus: String = "instock",
    @Json(name = "stock_quantity") val stockQuantity: Int? = null,
    @Json(name = "image") val image: WooProductImage? = null,
    @Json(name = "attributes") val attributes: List<WooVariationAttribute> = emptyList()
)

@JsonClass(generateAdapter = true)
data class WooVariationAttribute(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "name") val name: String = "",
    @Json(name = "option") val option: String = ""
)

@JsonClass(generateAdapter = true)
data class WooProductReview(
    @Json(name = "id") val id: Long,
    @Json(name = "date_created") val dateCreated: String = "",
    @Json(name = "review") val review: String = "",
    @Json(name = "rating") val rating: Int = 5,
    @Json(name = "reviewer") val reviewer: String = "",
    @Json(name = "verified") val verified: Boolean = false
)

@JsonClass(generateAdapter = true)
data class WooProductReviewCreateRequest(
    @Json(name = "product_id") val productId: Long,
    @Json(name = "review") val review: String,
    @Json(name = "reviewer") val reviewer: String,
    @Json(name = "reviewer_email") val reviewerEmail: String,
    @Json(name = "rating") val rating: Int
)

@JsonClass(generateAdapter = true)
data class WooCoupon(
    @Json(name = "id") val id: Long,
    @Json(name = "code") val code: String = "",
    @Json(name = "amount") val amount: String = "0",
    @Json(name = "discount_type") val discountType: String = "fixed_cart",
    @Json(name = "description") val description: String = "",
    @Json(name = "minimum_amount") val minimumAmount: String = "0",
    @Json(name = "maximum_amount") val maximumAmount: String = "0"
)

@JsonClass(generateAdapter = true)
data class WooPaymentGateway(
    @Json(name = "id") val id: String,
    @Json(name = "title") val title: String = "",
    @Json(name = "description") val description: String = "",
    @Json(name = "order") val order: Int = 0,
    @Json(name = "enabled") val enabled: Boolean = false,
    @Json(name = "method_title") val methodTitle: String = "",
    @Json(name = "method_description") val methodDescription: String = ""
)

@JsonClass(generateAdapter = true)
data class WooBillingAddress(
    @Json(name = "first_name") val firstName: String = "",
    @Json(name = "last_name") val lastName: String = "",
    @Json(name = "address_1") val address1: String = "",
    @Json(name = "address_2") val address2: String = "",
    @Json(name = "city") val city: String = "",
    @Json(name = "state") val state: String = "",
    @Json(name = "postcode") val postcode: String = "",
    @Json(name = "country") val country: String = "US",
    @Json(name = "email") val email: String = "",
    @Json(name = "phone") val phone: String = ""
)

@JsonClass(generateAdapter = true)
data class WooShippingAddress(
    @Json(name = "first_name") val firstName: String = "",
    @Json(name = "last_name") val lastName: String = "",
    @Json(name = "address_1") val address1: String = "",
    @Json(name = "address_2") val address2: String = "",
    @Json(name = "city") val city: String = "",
    @Json(name = "state") val state: String = "",
    @Json(name = "postcode") val postcode: String = "",
    @Json(name = "country") val country: String = "US"
)

@JsonClass(generateAdapter = true)
data class WooOrderLineItemRequest(
    @Json(name = "product_id") val productId: Long,
    @Json(name = "variation_id") val variationId: Long? = null,
    @Json(name = "quantity") val quantity: Int
)

@JsonClass(generateAdapter = true)
data class WooOrderCouponLineRequest(
    @Json(name = "code") val code: String
)

@JsonClass(generateAdapter = true)
data class WooOrderCreateRequest(
    @Json(name = "customer_id") val customerId: Long? = null,
    @Json(name = "payment_method") val paymentMethod: String,
    @Json(name = "payment_method_title") val paymentMethodTitle: String,
    @Json(name = "set_paid") val setPaid: Boolean = false,
    @Json(name = "billing") val billing: WooBillingAddress,
    @Json(name = "shipping") val shipping: WooShippingAddress,
    @Json(name = "line_items") val lineItems: List<WooOrderLineItemRequest>,
    @Json(name = "coupon_lines") val couponLines: List<WooOrderCouponLineRequest> = emptyList(),
    @Json(name = "customer_note") val customerNote: String = ""
)

@JsonClass(generateAdapter = true)
data class WooOrderLineItemResponse(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "name") val name: String = "",
    @Json(name = "product_id") val productId: Long = 0,
    @Json(name = "variation_id") val variationId: Long = 0,
    @Json(name = "quantity") val quantity: Int = 1,
    @Json(name = "total") val total: String = "0.00"
)

@JsonClass(generateAdapter = true)
data class WooOrderResponse(
    @Json(name = "id") val id: Long,
    @Json(name = "customer_id") val customerId: Long = 0,
    @Json(name = "number") val number: String = "",
    @Json(name = "order_key") val orderKey: String = "",
    @Json(name = "status") val status: String = "pending",
    @Json(name = "currency") val currency: String = "USD",
    @Json(name = "date_created") val dateCreated: String = "",
    @Json(name = "discount_total") val discountTotal: String = "0.00",
    @Json(name = "shipping_total") val shippingTotal: String = "0.00",
    @Json(name = "total") val total: String = "0.00",
    @Json(name = "payment_method") val paymentMethod: String = "",
    @Json(name = "payment_method_title") val paymentMethodTitle: String = "",
    @Json(name = "payment_url") val paymentUrl: String? = null,
    @Json(name = "line_items") val lineItems: List<WooOrderLineItemResponse> = emptyList(),
    @Json(name = "billing") val billing: WooBillingAddress? = null
)

@JsonClass(generateAdapter = true)
data class WooCustomer(
    @Json(name = "id") val id: Long,
    @Json(name = "email") val email: String = "",
    @Json(name = "first_name") val firstName: String = "",
    @Json(name = "last_name") val lastName: String = "",
    @Json(name = "role") val role: String = "customer",
    @Json(name = "username") val username: String = "",
    @Json(name = "avatar_url") val avatarUrl: String = "",
    @Json(name = "billing") val billing: WooBillingAddress? = null,
    @Json(name = "shipping") val shipping: WooShippingAddress? = null
)

@JsonClass(generateAdapter = true)
data class WooCustomerCreateRequest(
    @Json(name = "email") val email: String,
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    @Json(name = "username") val username: String,
    @Json(name = "password") val password: String
)

@JsonClass(generateAdapter = true)
data class WooCustomerUpdateRequest(
    @Json(name = "first_name") val firstName: String,
    @Json(name = "last_name") val lastName: String,
    @Json(name = "billing") val billing: WooBillingAddress,
    @Json(name = "shipping") val shipping: WooShippingAddress
)

@JsonClass(generateAdapter = true)
data class WpJwtTokenRequest(
    @Json(name = "username") val username: String,
    @Json(name = "password") val password: String
)

@JsonClass(generateAdapter = true)
data class WpJwtTokenResponse(
    @Json(name = "token") val token: String? = null,
    @Json(name = "user_email") val userEmail: String? = null,
    @Json(name = "user_nicename") val userNicename: String? = null,
    @Json(name = "user_display_name") val userDisplayName: String? = null
)

@JsonClass(generateAdapter = true)
data class WpUserMeResponse(
    @Json(name = "id") val id: Long = 0,
    @Json(name = "name") val name: String = "",
    @Json(name = "slug") val slug: String = "",
    @Json(name = "email") val email: String? = null
)
