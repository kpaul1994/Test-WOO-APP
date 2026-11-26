package com.example.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.data.model.CustomerAddress
import com.example.data.model.CustomerSession
import com.example.data.model.StoreConfig
import com.example.data.security.CryptoManager
import com.example.ui.theme.ThemeMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "mercato_prefs")

@Serializable
private data class StoredStoreEntry(
    val storeUrl: String,
    val storeName: String,
    val encryptedConsumerKey: String,
    val encryptedConsumerSecret: String,
    val currencySymbol: String = "$",
    val currencyCode: String = "USD",
    val tagline: String = "",
    val lastSyncedAt: Long = 0L
)

@Serializable
private data class StoredCustomerEntry(
    val storeUrl: String,
    val customerId: Long,
    val email: String,
    val username: String,
    val firstName: String = "",
    val lastName: String = "",
    val avatarUrl: String = "",
    val encryptedJwtToken: String = "",
    val billing: CustomerAddress = CustomerAddress()
)

class StorePreferences(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }

    private object Keys {
        val ACTIVE_STORE_URL = stringPreferencesKey("active_store_url")
        val SAVED_STORES_JSON = stringPreferencesKey("saved_stores_json")
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val RECENT_ORDER_IDS = stringPreferencesKey("recent_order_ids")
        val CUSTOMER_SESSIONS_JSON = stringPreferencesKey("customer_sessions_json")
        val HIDE_DEMO_CONTROLS = booleanPreferencesKey("hide_demo_controls")
    }

    val themeModeFlow: Flow<ThemeMode> = context.dataStore.data.map { prefs ->
        val raw = prefs[Keys.THEME_MODE] ?: ThemeMode.SYSTEM.name
        ThemeMode.entries.firstOrNull { it.name == raw } ?: ThemeMode.SYSTEM
    }

    val hideDemoControlsFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[Keys.HIDE_DEMO_CONTROLS] ?: false
    }

    val savedStoresFlow: Flow<List<StoreConfig>> = context.dataStore.data.map { prefs ->
        decodeStores(prefs[Keys.SAVED_STORES_JSON])
    }

    val activeStoreFlow: Flow<StoreConfig?> = context.dataStore.data.map { prefs ->
        val activeUrl = prefs[Keys.ACTIVE_STORE_URL]
        val stores = decodeStores(prefs[Keys.SAVED_STORES_JSON])
        if (activeUrl.isNullOrBlank()) null else stores.firstOrNull { it.storeUrl == activeUrl }
    }

    val activeCustomerSessionFlow: Flow<CustomerSession?> = context.dataStore.data.map { prefs ->
        val activeUrl = prefs[Keys.ACTIVE_STORE_URL] ?: return@map null
        decodeCustomers(prefs[Keys.CUSTOMER_SESSIONS_JSON]).firstOrNull { it.storeUrl == activeUrl }
    }

    val recentOrderIdsFlow: Flow<Map<String, List<Long>>> = context.dataStore.data.map { prefs ->
        val raw = prefs[Keys.RECENT_ORDER_IDS] ?: return@map emptyMap()
        try {
            json.decodeFromString<Map<String, List<Long>>>(raw)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun saveAndActivateStore(config: StoreConfig) {
        context.dataStore.edit { prefs ->
            val current = decodeEntries(prefs[Keys.SAVED_STORES_JSON]).toMutableList()
            val newEntry = StoredStoreEntry(
                storeUrl = config.storeUrl,
                storeName = config.storeName,
                encryptedConsumerKey = CryptoManager.encrypt(config.consumerKey),
                encryptedConsumerSecret = CryptoManager.encrypt(config.consumerSecret),
                currencySymbol = config.currencySymbol,
                currencyCode = config.currencyCode,
                tagline = config.tagline,
                lastSyncedAt = config.lastSyncedAt
            )
            val idx = current.indexOfFirst { it.storeUrl == config.storeUrl }
            if (idx >= 0) current[idx] = newEntry else current.add(0, newEntry)
            prefs[Keys.SAVED_STORES_JSON] = json.encodeToString(current)
            prefs[Keys.ACTIVE_STORE_URL] = config.storeUrl
        }
    }

    suspend fun saveCustomerSession(session: CustomerSession) {
        context.dataStore.edit { prefs ->
            val current = decodeCustomerEntries(prefs[Keys.CUSTOMER_SESSIONS_JSON]).toMutableList()
            val entry = StoredCustomerEntry(
                storeUrl = session.storeUrl,
                customerId = session.customerId,
                email = session.email,
                username = session.username,
                firstName = session.firstName,
                lastName = session.lastName,
                avatarUrl = session.avatarUrl,
                encryptedJwtToken = if (session.jwtToken.isNotBlank()) CryptoManager.encrypt(session.jwtToken) else "",
                billing = session.billing
            )
            val idx = current.indexOfFirst { it.storeUrl == session.storeUrl }
            if (idx >= 0) current[idx] = entry else current.add(0, entry)
            prefs[Keys.CUSTOMER_SESSIONS_JSON] = json.encodeToString(current)
        }
    }

    suspend fun clearCustomerSession(storeUrl: String) {
        context.dataStore.edit { prefs ->
            val updated = decodeCustomerEntries(prefs[Keys.CUSTOMER_SESSIONS_JSON])
                .filterNot { it.storeUrl == storeUrl }
            prefs[Keys.CUSTOMER_SESSIONS_JSON] = json.encodeToString(updated)
        }
    }

    suspend fun setHideDemoControls(hide: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[Keys.HIDE_DEMO_CONTROLS] = hide
        }
    }

    suspend fun switchActiveStore(storeUrl: String) {
        context.dataStore.edit { prefs ->
            prefs[Keys.ACTIVE_STORE_URL] = storeUrl
        }
    }

    suspend fun disconnectActiveStore() {
        context.dataStore.edit { prefs ->
            prefs.remove(Keys.ACTIVE_STORE_URL)
        }
    }

    suspend fun removeSavedStore(storeUrl: String) {
        context.dataStore.edit { prefs ->
            val current = decodeEntries(prefs[Keys.SAVED_STORES_JSON]).filterNot { it.storeUrl == storeUrl }
            prefs[Keys.SAVED_STORES_JSON] = json.encodeToString(current)
            val customers = decodeCustomerEntries(prefs[Keys.CUSTOMER_SESSIONS_JSON])
                .filterNot { it.storeUrl == storeUrl }
            prefs[Keys.CUSTOMER_SESSIONS_JSON] = json.encodeToString(customers)
            if (prefs[Keys.ACTIVE_STORE_URL] == storeUrl) {
                if (current.isNotEmpty()) {
                    prefs[Keys.ACTIVE_STORE_URL] = current.first().storeUrl
                } else {
                    prefs.remove(Keys.ACTIVE_STORE_URL)
                }
            }
        }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { prefs ->
            prefs[Keys.THEME_MODE] = mode.name
        }
    }

    suspend fun recordPlacedOrder(storeUrl: String, orderId: Long) {
        context.dataStore.edit { prefs ->
            val existing = try {
                prefs[Keys.RECENT_ORDER_IDS]?.let {
                    json.decodeFromString<Map<String, List<Long>>>(it)
                } ?: emptyMap()
            } catch (_: Exception) {
                emptyMap()
            }
            val list = (listOf(orderId) + (existing[storeUrl] ?: emptyList())).distinct().take(25)
            val updated = existing.toMutableMap().apply { put(storeUrl, list) }
            prefs[Keys.RECENT_ORDER_IDS] = json.encodeToString(updated)
        }
    }

    private fun decodeEntries(raw: String?): List<StoredStoreEntry> {
        if (raw.isNullOrBlank()) return emptyList()
        return try {
            json.decodeFromString<List<StoredStoreEntry>>(raw)
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun decodeStores(raw: String?): List<StoreConfig> {
        return decodeEntries(raw).mapNotNull { entry ->
            val ck = CryptoManager.decrypt(entry.encryptedConsumerKey)
            val cs = CryptoManager.decrypt(entry.encryptedConsumerSecret)
            if (ck.isBlank() || cs.isBlank()) {
                null
            } else {
                StoreConfig(
                    storeUrl = entry.storeUrl,
                    storeName = entry.storeName,
                    consumerKey = ck,
                    consumerSecret = cs,
                    currencySymbol = entry.currencySymbol,
                    currencyCode = entry.currencyCode,
                    tagline = entry.tagline,
                    lastSyncedAt = entry.lastSyncedAt
                )
            }
        }
    }

    private fun decodeCustomerEntries(raw: String?): List<StoredCustomerEntry> {
        if (raw.isNullOrBlank()) return emptyList()
        return try {
            json.decodeFromString<List<StoredCustomerEntry>>(raw)
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun decodeCustomers(raw: String?): List<CustomerSession> {
        return decodeCustomerEntries(raw).map { entry ->
            CustomerSession(
                storeUrl = entry.storeUrl,
                customerId = entry.customerId,
                email = entry.email,
                username = entry.username,
                firstName = entry.firstName,
                lastName = entry.lastName,
                avatarUrl = entry.avatarUrl,
                jwtToken = if (entry.encryptedJwtToken.isNotBlank()) CryptoManager.decrypt(entry.encryptedJwtToken) else "",
                billing = entry.billing
            )
        }
    }
}
