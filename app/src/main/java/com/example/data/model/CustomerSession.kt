package com.example.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CustomerAddress(
    val firstName: String = "",
    val lastName: String = "",
    val address1: String = "",
    val city: String = "",
    val state: String = "",
    val postcode: String = "",
    val country: String = "US",
    val phone: String = ""
)

@Serializable
data class CustomerSession(
    val storeUrl: String,
    val customerId: Long,
    val email: String,
    val username: String,
    val firstName: String = "",
    val lastName: String = "",
    val avatarUrl: String = "",
    val jwtToken: String = "",
    val billing: CustomerAddress = CustomerAddress()
) {
    val fullName: String
        get() = listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(" ")
            .ifBlank { username.ifBlank { email } }
}
