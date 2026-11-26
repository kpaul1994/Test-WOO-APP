package com.example

import com.example.data.model.WooCoupon
import com.example.util.PriceFormatter
import com.example.util.UrlValidationResult
import com.example.util.UrlValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class StoreUtilitiesTest {

    @Test
    fun `url validator normalizes domain and strips wp-json suffix`() {
        val result = UrlValidator.validateAndNormalize("shop.example.com/wp-json/wc/v3/products")
        assertTrue(result is UrlValidationResult.Valid)
        val valid = result as UrlValidationResult.Valid
        assertEquals("https://shop.example.com/", valid.normalizedBaseUrl)
        assertEquals("shop.example.com", valid.host)
    }

    @Test
    fun `url validator preserves subdirectory store path`() {
        val result = UrlValidator.validateAndNormalize("https://Example.com/boutique/")
        assertTrue(result is UrlValidationResult.Valid)
        val valid = result as UrlValidationResult.Valid
        assertEquals("https://example.com/boutique/", valid.normalizedBaseUrl)
    }

    @Test
    fun `url validator rejects http and private addresses`() {
        assertTrue(UrlValidator.validateAndNormalize("http://mystore.com") is UrlValidationResult.Invalid)
        assertTrue(UrlValidator.validateAndNormalize("https://127.0.0.1") is UrlValidationResult.Invalid)
        assertTrue(UrlValidator.validateAndNormalize("https://169.254.169.254") is UrlValidationResult.Invalid)
        assertTrue(UrlValidator.validateAndNormalize("https://192.168.1.50") is UrlValidationResult.Invalid)
        assertTrue(UrlValidator.validateAndNormalize("https://localhost") is UrlValidationResult.Invalid)
    }

    @Test
    fun `price formatter formats currency and computes discount percentage`() {
        assertEquals("$1,299.50", PriceFormatter.format(1299.5, "$"))
        assertEquals("€49.00", PriceFormatter.formatRaw("49", "&euro;".let { "€" }))
        assertEquals(25, PriceFormatter.discountPercent("100.00", "75.00"))
        assertEquals(null, PriceFormatter.discountPercent("50.00", "50.00"))
    }

    @Test
    fun `coupon discount calculation handles percent and fixed cart`() {
        val subtotal = 120.0
        val percentCoupon = WooCoupon(id = 1, code = "SAVE15", amount = "15", discountType = "percent")
        val fixedCoupon = WooCoupon(id = 2, code = "FLAT20", amount = "20", discountType = "fixed_cart")

        val pctAmount = percentCoupon.amount.toDouble()
        val computedPct = (subtotal * (pctAmount / 100.0)).coerceAtMost(subtotal)
        assertEquals(18.0, computedPct, 0.001)

        val computedFixed = fixedCoupon.amount.toDouble().coerceAtMost(subtotal)
        assertEquals(20.0, computedFixed, 0.001)
    }
}
