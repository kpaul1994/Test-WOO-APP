package com.example.data.remote

import com.example.data.model.WooCoupon
import com.example.data.model.WooCurrency
import com.example.data.model.WooOrderCreateRequest
import com.example.data.model.WooOrderResponse
import com.example.data.model.WooPaymentGateway
import com.example.data.model.WooProduct
import com.example.data.model.WooProductCategory
import com.example.data.model.WooProductReview
import com.example.data.model.WooProductVariation
import com.example.data.model.WordPressRootInfo
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface WooCommerceApi {

    @GET("wp-json/")
    suspend fun getWordPressRoot(): WordPressRootInfo

    @GET("wp-json/wc/v3/data/currencies/current")
    suspend fun getCurrentCurrency(): WooCurrency

    @GET("wp-json/wc/v3/products")
    suspend fun getProducts(
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 20,
        @Query("search") search: String? = null,
        @Query("category") categoryId: Long? = null,
        @Query("orderby") orderBy: String = "date",
        @Query("order") order: String = "desc",
        @Query("on_sale") onSale: Boolean? = null,
        @Query("featured") featured: Boolean? = null,
        @Query("stock_status") stockStatus: String? = null,
        @Query("min_price") minPrice: String? = null,
        @Query("max_price") maxPrice: String? = null,
        @Query("status") status: String = "publish"
    ): List<WooProduct>

    @GET("wp-json/wc/v3/products/{id}")
    suspend fun getProductById(
        @Path("id") productId: Long
    ): WooProduct

    @GET("wp-json/wc/v3/products/{id}/variations")
    suspend fun getProductVariations(
        @Path("id") productId: Long,
        @Query("per_page") perPage: Int = 50
    ): List<WooProductVariation>

    @GET("wp-json/wc/v3/products/categories")
    suspend fun getCategories(
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 50,
        @Query("hide_empty") hideEmpty: Boolean = true,
        @Query("orderby") orderBy: String = "count",
        @Query("order") order: String = "desc"
    ): List<WooProductCategory>

    @GET("wp-json/wc/v3/products/reviews")
    suspend fun getProductReviews(
        @Query("product") productId: Long,
        @Query("per_page") perPage: Int = 20,
        @Query("status") status: String = "approved"
    ): List<WooProductReview>

    @GET("wp-json/wc/v3/coupons")
    suspend fun findCouponByCode(
        @Query("code") code: String
    ): List<WooCoupon>

    @GET("wp-json/wc/v3/payment_gateways")
    suspend fun getPaymentGateways(): List<WooPaymentGateway>

    @POST("wp-json/wc/v3/orders")
    suspend fun createOrder(
        @Body request: WooOrderCreateRequest
    ): WooOrderResponse

    @GET("wp-json/wc/v3/orders")
    suspend fun getOrders(
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 20,
        @Query("include") includeIds: String? = null,
        @Query("search") search: String? = null
    ): List<WooOrderResponse>

    @GET("wp-json/wc/v3/orders/{id}")
    suspend fun getOrderById(
        @Path("id") orderId: Long
    ): WooOrderResponse
}
