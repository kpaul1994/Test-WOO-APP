package com.example.util

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.roundToInt

object PriceFormatter {
    private val decimalFormat = DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.US))

    fun format(amount: Double, currencySymbol: String): String {
        val safeSymbol = HtmlTextParser.decodeEntities(currencySymbol).ifBlank { "$" }
        return "$safeSymbol${decimalFormat.format(amount.coerceAtLeast(0.0))}"
    }

    fun formatRaw(rawPrice: String?, currencySymbol: String): String {
        val value = rawPrice?.toDoubleOrNull() ?: return ""
        return format(value, currencySymbol)
    }

    fun discountPercent(regularPrice: String?, salePrice: String?): Int? {
        val regular = regularPrice?.toDoubleOrNull() ?: return null
        val sale = salePrice?.toDoubleOrNull() ?: return null
        if (regular <= 0.0 || sale <= 0.0 || sale >= regular) return null
        val pct = (((regular - sale) / regular) * 100.0).roundToInt()
        return pct.takeIf { it > 0 }
    }
}
