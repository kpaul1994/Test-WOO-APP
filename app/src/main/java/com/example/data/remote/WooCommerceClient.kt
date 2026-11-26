package com.example.data.remote

import com.example.data.model.StoreConfig
import com.example.util.HtmlTextParser
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Credentials
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object WooCommerceClient {

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val baseOkHttpClient: OkHttpClient by lazy {
        val logger = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
            redactHeader("Authorization")
            redactHeader("Cookie")
        }
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .addInterceptor(logger)
            .build()
    }

    @Volatile
    private var cachedKey: String? = null

    @Volatile
    private var cachedApi: WooCommerceApi? = null

    fun createApi(config: StoreConfig): WooCommerceApi {
        val cacheKey = "${config.storeUrl}|${config.consumerKey}|${config.consumerSecret.hashCode()}"
        cachedApi?.let { existing ->
            if (cachedKey == cacheKey) return existing
        }

        val expectedHost = config.storeUrl.toHttpUrlOrNull()?.host?.lowercase()
        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val reqHost = original.url.host.lowercase()
            val builder = original.newBuilder()
                .header("Accept", "application/json")
                .header("User-Agent", "Mercato-WooCommerce-Android/1.0")

            if (original.url.isHttps && expectedHost != null && reqHost == expectedHost) {
                val credentials = Credentials.basic(config.consumerKey.trim(), config.consumerSecret.trim())
                builder.header("Authorization", credentials)
            }
            chain.proceed(builder.build())
        }

        val client = baseOkHttpClient.newBuilder()
            .addInterceptor(authInterceptor)
            .build()

        val safeBaseUrl = if (config.storeUrl.endsWith("/")) config.storeUrl else "${config.storeUrl}/"
        val api = Retrofit.Builder()
            .baseUrl(safeBaseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(WooCommerceApi::class.java)

        cachedKey = cacheKey
        cachedApi = api
        return api
    }

    fun formatNetworkError(error: Throwable): String {
        return when (error) {
            is HttpException -> {
                val body = try {
                    error.response()?.errorBody()?.string()
                } catch (_: Exception) {
                    null
                }
                val wooMessage = body?.let {
                    try {
                        val json = JSONObject(it)
                        val msg = json.optString("message", "")
                        if (msg.isNotBlank()) HtmlTextParser.toPlainText(msg) else null
                    } catch (_: Exception) {
                        null
                    }
                }
                when (error.code()) {
                    401 -> wooMessage ?: "Authentication failed (401). Check your Consumer Key and Consumer Secret."
                    403 -> wooMessage ?: "Access forbidden (403). Ensure your API key has Read/Write permissions."
                    404 -> wooMessage ?: "WooCommerce REST API v3 endpoint not found (404). Verify permalinks are enabled on WordPress."
                    else -> wooMessage ?: "Store returned HTTP ${error.code()}. Please try again."
                }
            }
            is IOException -> "Network error: unable to reach the store. Check the URL and internet connection."
            else -> error.localizedMessage ?: "An unexpected error occurred."
        }
    }
}
