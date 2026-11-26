package com.example.util

import androidx.core.text.HtmlCompat

object HtmlTextParser {
    private val commonEntities = mapOf(
        "&amp;" to "&",
        "&lt;" to "<",
        "&gt;" to ">",
        "&quot;" to "\"",
        "&#039;" to "'",
        "&apos;" to "'",
        "&rsquo;" to "’",
        "&lsquo;" to "‘",
        "&rdquo;" to "”",
        "&ldquo;" to "“",
        "&ndash;" to "–",
        "&mdash;" to "—",
        "&nbsp;" to " ",
        "&#36;" to "$",
        "&dollar;" to "$",
        "&euro;" to "€",
        "&pound;" to "£",
        "&yen;" to "¥",
        "&#8377;" to "₹",
        "&#x20B9;" to "₹"
    )

    /**
     * Safely converts HTML returned by WooCommerce (descriptions, review bodies, category names)
     * into clean, readable plain text without executing any scripts or markup.
     */
    fun toPlainText(html: String?): String {
        if (html.isNullOrBlank()) return ""
        val withLineBreaks = html
            .replace(Regex("(?i)<br\\s*/?>"), "\n")
            .replace(Regex("(?i)</p>"), "\n\n")
            .replace(Regex("(?i)<li>"), "• ")
            .replace(Regex("(?i)</li>"), "\n")
        return try {
            val spanned = HtmlCompat.fromHtml(withLineBreaks, HtmlCompat.FROM_HTML_MODE_COMPACT)
            spanned.toString()
                .replace(Regex("\n{3,}"), "\n\n")
                .trim()
        } catch (_: Throwable) {
            decodeEntities(withLineBreaks.replace(Regex("<[^>]*>"), ""))
                .replace(Regex("\n{3,}"), "\n\n")
                .trim()
        }
    }

    fun decodeEntities(text: String?): String {
        val safeText = text?.trim().orEmpty()
        if (safeText.isEmpty()) return ""
        if (!safeText.contains('&') && !safeText.contains('<')) return safeText
        return try {
            HtmlCompat.fromHtml(safeText, HtmlCompat.FROM_HTML_MODE_COMPACT).toString().trim()
        } catch (_: Throwable) {
            var decoded = safeText
            commonEntities.forEach { (entity, replacement) ->
                decoded = decoded.replace(entity, replacement, ignoreCase = true)
            }
            decoded.trim()
        }
    }
}
