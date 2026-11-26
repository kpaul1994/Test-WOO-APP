package com.example.util

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import java.net.InetAddress

sealed class UrlValidationResult {
    data class Valid(val normalizedBaseUrl: String, val host: String) : UrlValidationResult()
    data class Invalid(val reason: String) : UrlValidationResult()
}

object UrlValidator {

    /**
     * Normalizes and validates a WooCommerce store URL.
     * - Enforces HTTPS so REST API credentials are never sent over cleartext HTTP.
     * - Strips /wp-json... suffixes if the user pasted a full API endpoint.
     * - Rejects loopback, link-local metadata, and private IP addresses.
     */
    fun validateAndNormalize(rawInput: String): UrlValidationResult {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) {
            return UrlValidationResult.Invalid("Please enter your WooCommerce store URL.")
        }

        val withScheme = when {
            trimmed.startsWith("https://", ignoreCase = true) -> trimmed
            trimmed.startsWith("http://", ignoreCase = true) -> {
                return UrlValidationResult.Invalid(
                    "HTTPS is required to keep your WooCommerce API keys encrypted in transit."
                )
            }
            else -> "https://$trimmed"
        }

        // Strip /wp-json... if someone pasted the API path directly
        val cleaned = withScheme
            .substringBefore("/wp-json")
            .trimEnd('/') + "/"

        val parsed: HttpUrl = cleaned.toHttpUrlOrNull()
            ?: return UrlValidationResult.Invalid("Enter a valid domain URL (e.g. https://yourstore.com).")

        if (!parsed.isHttps) {
            return UrlValidationResult.Invalid("Only HTTPS store URLs are supported.")
        }

        val host = parsed.host.lowercase()
        if (host.isBlank() || !host.contains('.')) {
            return UrlValidationResult.Invalid("Enter a complete store domain (e.g. https://shop.example.com).")
        }

        if (isDisallowedHost(host)) {
            return UrlValidationResult.Invalid("Local, loopback, and private network addresses cannot be used.")
        }

        val portPart = if (parsed.port != 443) ":${parsed.port}" else ""
        // Preserve subdirectory path if store is hosted at e.g. https://example.com/shop/
        val pathSegments = parsed.pathSegments.filter { it.isNotBlank() }
        val basePath = if (pathSegments.isEmpty()) "/" else "/${pathSegments.joinToString("/")}/"
        val normalized = "https://$host$portPart$basePath"

        return UrlValidationResult.Valid(normalizedBaseUrl = normalized, host = host)
    }

    private fun isDisallowedHost(host: String): Boolean {
        if (host == "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
            return true
        }
        // Check literal IP ranges without blocking on DNS
        val ipLiteralRegex = Regex("""^\d{1,3}(\.\d{1,3}){3}$""")
        if (ipLiteralRegex.matches(host)) {
            val parts = host.split(".").mapNotNull { it.toIntOrNull() }
            if (parts.size != 4 || parts.any { it !in 0..255 }) return true
            val (a, b, _, _) = parts
            if (a == 127 || a == 10 || a == 0) return true
            if (a == 169 && b == 254) return true
            if (a == 172 && b in 16..31) return true
            if (a == 192 && b == 168) return true
        }
        if (host.contains(":") || host.startsWith("[")) {
            // IPv6 loopback / link-local / ULA check
            val cleanV6 = host.removePrefix("[").removeSuffix("]").lowercase()
            if (cleanV6 == "::1" || cleanV6.startsWith("fe80") || cleanV6.startsWith("fc") || cleanV6.startsWith("fd")) {
                return true
            }
        }
        return try {
            val addr = InetAddress.getByName(host)
            addr.isLoopbackAddress || addr.isLinkLocalAddress || addr.isSiteLocalAddress || addr.isAnyLocalAddress
        } catch (_: Exception) {
            // If offline or unresolvable at validation time, let OkHttp surface connection error later
            false
        }
    }
}
