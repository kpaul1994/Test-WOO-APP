package com.example.data.repository

import com.example.data.model.StoreConfig
import com.example.data.model.WooProduct
import com.example.data.model.WooProductCategory
import com.example.data.model.WooProductReview
import com.example.data.model.WooProductVariation
import com.example.data.remote.WooCommerceClient
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

data class HomeFeedData(
    val categories: List<WooProductCategory>,
    val featuredProducts: List<WooProduct>,
    val onSaleProducts: List<WooProduct>,
    val latestProducts: List<WooProduct>
)

data class ProductDetailData(
    val product: WooProduct,
    val variations: List<WooProductVariation>,
    val reviews: List<WooProductReview>,
    val relatedProducts: List<WooProduct>
)

enum class CatalogSortOption(val label: String, val orderBy: String, val order: String) {
    NEWEST("Newest", "date", "desc"),
    POPULAR("Popular", "popularity", "desc"),
    TOP_RATED("Top Rated", "rating", "desc"),
    PRICE_LOW("Price: Low to High", "price", "asc"),
    PRICE_HIGH("Price: High to Low", "price", "desc")
}

class CatalogRepository {

    suspend fun fetchHomeFeed(config: StoreConfig): Result<HomeFeedData> {
        return try {
            val api = WooCommerceClient.createApi(config)
            coroutineScope {
                val categoriesDef = async {
                    runCatching { api.getCategories(page = 1, perPage = 20, hideEmpty = true) }
                        .getOrDefault(emptyList())
                }
                val featuredDef = async {
                    runCatching { api.getProducts(page = 1, perPage = 10, featured = true) }
                        .getOrDefault(emptyList())
                }
                val onSaleDef = async {
                    runCatching { api.getProducts(page = 1, perPage = 10, onSale = true) }
                        .getOrDefault(emptyList())
                }
                val latestDef = async {
                    api.getProducts(page = 1, perPage = 20, orderBy = "date", order = "desc")
                }

                Result.success(
                    HomeFeedData(
                        categories = categoriesDef.await(),
                        featuredProducts = featuredDef.await(),
                        onSaleProducts = onSaleDef.await(),
                        latestProducts = latestDef.await()
                    )
                )
            }
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun fetchProducts(
        config: StoreConfig,
        page: Int = 1,
        perPage: Int = 20,
        search: String? = null,
        categoryId: Long? = null,
        sort: CatalogSortOption = CatalogSortOption.NEWEST,
        onSaleOnly: Boolean = false,
        inStockOnly: Boolean = false,
        minPrice: String? = null,
        maxPrice: String? = null
    ): Result<List<WooProduct>> {
        return try {
            val api = WooCommerceClient.createApi(config)
            val products = api.getProducts(
                page = page,
                perPage = perPage,
                search = search?.trim()?.takeIf { it.isNotEmpty() },
                categoryId = categoryId,
                orderBy = sort.orderBy,
                order = sort.order,
                onSale = if (onSaleOnly) true else null,
                stockStatus = if (inStockOnly) "instock" else null,
                minPrice = minPrice?.trim()?.takeIf { it.isNotEmpty() },
                maxPrice = maxPrice?.trim()?.takeIf { it.isNotEmpty() }
            )
            Result.success(products)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun fetchCategories(config: StoreConfig): Result<List<WooProductCategory>> {
        return try {
            val api = WooCommerceClient.createApi(config)
            Result.success(api.getCategories(page = 1, perPage = 50, hideEmpty = true))
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun fetchProductDetail(config: StoreConfig, productId: Long): Result<ProductDetailData> {
        return try {
            val api = WooCommerceClient.createApi(config)
            coroutineScope {
                val productDef = async { api.getProductById(productId) }
                val variationsDef = async {
                    runCatching { api.getProductVariations(productId) }.getOrDefault(emptyList())
                }
                val reviewsDef = async {
                    runCatching { api.getProductReviews(productId) }.getOrDefault(emptyList())
                }

                val product = productDef.await()
                val related = if (product.categories.isNotEmpty()) {
                    runCatching {
                        api.getProducts(
                            page = 1,
                            perPage = 8,
                            categoryId = product.categories.first().id
                        ).filter { it.id != product.id }
                    }.getOrDefault(emptyList())
                } else {
                    emptyList()
                }

                Result.success(
                    ProductDetailData(
                        product = product,
                        variations = variationsDef.await(),
                        reviews = reviewsDef.await(),
                        relatedProducts = related
                    )
                )
            }
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }

    suspend fun submitProductReview(
        config: StoreConfig,
        productId: Long,
        reviewerName: String,
        reviewerEmail: String,
        rating: Int,
        reviewText: String
    ): Result<WooProductReview> {
        if (reviewerName.isBlank() || !reviewerEmail.contains('@') || reviewText.isBlank()) {
            return Result.failure(IllegalArgumentException("Please provide your name, valid email, and review."))
        }
        return try {
            val api = WooCommerceClient.createApi(config)
            val created = api.createProductReview(
                com.example.data.model.WooProductReviewCreateRequest(
                    productId = productId,
                    review = reviewText.trim(),
                    reviewer = reviewerName.trim(),
                    reviewerEmail = reviewerEmail.trim(),
                    rating = rating.coerceIn(1, 5)
                )
            )
            Result.success(created)
        } catch (t: Throwable) {
            Result.failure(Exception(WooCommerceClient.formatNetworkError(t), t))
        }
    }
}
