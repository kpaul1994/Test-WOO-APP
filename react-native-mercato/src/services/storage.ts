import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_STORE_CONFIG } from '../config/env';
import {
  CartItem,
  CustomerAddress,
  CustomerSession,
  StoreConfig,
  ThemeMode,
  WishlistItem,
} from '../types/woo';

const KEY_ACTIVE_STORE_URL = 'mercato_active_store_url';
const KEY_SAVED_STORES_META = 'mercato_saved_stores_meta';
const KEY_CUSTOMER_SESSIONS = 'mercato_customer_sessions_meta';
const KEY_CART_ITEMS = 'mercato_cart_items';
const KEY_WISHLIST_ITEMS = 'mercato_wishlist_items';
const KEY_THEME_MODE = 'mercato_theme_mode';
const KEY_HIDE_DEMO = 'mercato_hide_demo_controls';
const KEY_RECENT_ORDER_IDS = 'mercato_recent_order_ids';

interface StoreMetadata {
  storeUrl: string;
  storeName: string;
  currencySymbol: string;
  currencyCode: string;
  tagline: string;
  lastSyncedAt: number;
}

interface StoreSecrets {
  consumerKey: string;
  consumerSecret: string;
}

/**
 * SecureStore keys may only contain alphanumeric characters, '.', '-', and '_'.
 */
function toSafeStoreKey(prefix: string, storeUrl: string): string {
  let hash = 5381;
  for (let i = 0; i < storeUrl.length; i += 1) {
    hash = (hash * 33) ^ storeUrl.charCodeAt(i);
  }
  const slug = storeUrl
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 40);
  return `${prefix}_${slug}_${(hash >>> 0).toString(36)}`;
}

const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

async function canUseSecureStore(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return await withTimeout(
      typeof SecureStore.isAvailableAsync === 'function' ? SecureStore.isAvailableAsync() : Promise.resolve(false),
      500,
      false,
    );
  } catch {
    return false;
  }
}

async function safeSetSecureItem(key: string, value: string): Promise<void> {
  try {
    const available = await canUseSecureStore();
    if (available) {
      await withTimeout(SecureStore.setItemAsync(key, value), 800, undefined);
      return;
    }
  } catch {
    // fallback below
  }
  try {
    await withTimeout(AsyncStorage.setItem(`__sec_${key}`, value), 800, undefined);
  } catch {
    // ignore
  }
}

async function safeGetSecureItem(key: string): Promise<string | null> {
  try {
    const available = await canUseSecureStore();
    if (available) {
      const val = await withTimeout(SecureStore.getItemAsync(key), 800, null);
      if (val !== null) return val;
    }
  } catch {
    // fallback below
  }
  try {
    return await withTimeout(AsyncStorage.getItem(`__sec_${key}`), 800, null);
  } catch {
    return null;
  }
}

async function safeDeleteSecureItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`__sec_${key}`);
  } catch {
    // ignore
  }
  try {
    const available = await canUseSecureStore();
    if (available) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // ignore
  }
}

async function setSecureJson<T>(key: string, value: T): Promise<void> {
  await safeSetSecureItem(key, JSON.stringify(value));
}

async function getSecureJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await safeGetSecureItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getAsyncJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadSavedStores(): Promise<StoreConfig[]> {
  const metas = await getAsyncJson<StoreMetadata[]>(KEY_SAVED_STORES_META, []);
  let dirty = false;
  const results: StoreConfig[] = [];
  for (const meta of metas) {
    if (!meta.storeName || meta.storeName.trim().toLowerCase() === 'my boutique') {
      meta.storeName = 'NextEcom Store';
      dirty = true;
    }
    const secrets = await getSecureJson<StoreSecrets>(
      toSafeStoreKey('mercato_store_sec', meta.storeUrl),
    );
    if (secrets?.consumerKey && secrets?.consumerSecret) {
      results.push({
        ...meta,
        consumerKey: secrets.consumerKey,
        consumerSecret: secrets.consumerSecret,
      });
    }
  }

  // Pre-seed default NextEcom WooCommerce store if no stores are saved
  if (results.length === 0 && DEFAULT_STORE_CONFIG) {
    return [DEFAULT_STORE_CONFIG];
  }

  if (dirty) {
    await AsyncStorage.setItem(KEY_SAVED_STORES_META, JSON.stringify(metas));
  }
  return results.sort((a, b) => b.lastSyncedAt - a.lastSyncedAt);
}

export async function saveStoreConfig(config: StoreConfig): Promise<StoreConfig[]> {
  await setSecureJson<StoreSecrets>(toSafeStoreKey('mercato_store_sec', config.storeUrl), {
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
  });

  const metas = await getAsyncJson<StoreMetadata[]>(KEY_SAVED_STORES_META, []);
  const nextMeta: StoreMetadata = {
    storeUrl: config.storeUrl,
    storeName: config.storeName,
    currencySymbol: config.currencySymbol,
    currencyCode: config.currencyCode,
    tagline: config.tagline,
    lastSyncedAt: config.lastSyncedAt,
  };
  const updatedMetas = [
    nextMeta,
    ...metas.filter((m) => m.storeUrl !== config.storeUrl),
  ];
  await AsyncStorage.setItem(KEY_SAVED_STORES_META, JSON.stringify(updatedMetas));
  await AsyncStorage.setItem(KEY_ACTIVE_STORE_URL, config.storeUrl);
  return updatedMetas.map((m) => ({
    ...m,
    consumerKey: m.storeUrl === config.storeUrl ? config.consumerKey : '',
    consumerSecret: m.storeUrl === config.storeUrl ? config.consumerSecret : '',
  }));
}

export async function setActiveStoreUrl(storeUrl: string | null): Promise<void> {
  if (!storeUrl) {
    await AsyncStorage.removeItem(KEY_ACTIVE_STORE_URL);
  } else {
    await AsyncStorage.setItem(KEY_ACTIVE_STORE_URL, storeUrl);
  }
}

export async function getActiveStoreUrl(): Promise<string | null> {
  const url = await AsyncStorage.getItem(KEY_ACTIVE_STORE_URL);
  if (url) return url;
  if (DEFAULT_STORE_CONFIG) {
    await AsyncStorage.setItem(KEY_ACTIVE_STORE_URL, DEFAULT_STORE_CONFIG.storeUrl);
    return DEFAULT_STORE_CONFIG.storeUrl;
  }
  return null;
}

export async function deleteSavedStore(storeUrl: string): Promise<StoreConfig[]> {
  await safeDeleteSecureItem(toSafeStoreKey('mercato_store_sec', storeUrl));
  await safeDeleteSecureItem(toSafeStoreKey('mercato_jwt', storeUrl));

  const metas = await getAsyncJson<StoreMetadata[]>(KEY_SAVED_STORES_META, []);
  const remaining = metas.filter((m) => m.storeUrl !== storeUrl);
  await AsyncStorage.setItem(KEY_SAVED_STORES_META, JSON.stringify(remaining));

  const activeUrl = await getActiveStoreUrl();
  if (activeUrl === storeUrl) {
    if (remaining.length > 0) {
      await AsyncStorage.setItem(KEY_ACTIVE_STORE_URL, remaining[0].storeUrl);
    } else {
      await AsyncStorage.removeItem(KEY_ACTIVE_STORE_URL);
    }
  }
  return loadSavedStores();
}

export async function loadCustomerSession(storeUrl: string): Promise<CustomerSession | null> {
  const sessions = await getAsyncJson<Record<string, Omit<CustomerSession, 'jwtToken'>>>(
    KEY_CUSTOMER_SESSIONS,
    {},
  );
  const sessionMeta = sessions[storeUrl];
  if (!sessionMeta) return null;
  const jwt = (await safeGetSecureItem(toSafeStoreKey('mercato_jwt', storeUrl))) || '';
  return {
    ...sessionMeta,
    jwtToken: jwt,
  };
}

export async function saveCustomerSession(session: CustomerSession): Promise<void> {
  const { jwtToken, ...meta } = session;
  if (jwtToken) {
    await safeSetSecureItem(toSafeStoreKey('mercato_jwt', session.storeUrl), jwtToken);
  } else {
    await safeDeleteSecureItem(toSafeStoreKey('mercato_jwt', session.storeUrl));
  }
  const sessions = await getAsyncJson<Record<string, Omit<CustomerSession, 'jwtToken'>>>(
    KEY_CUSTOMER_SESSIONS,
    {},
  );
  sessions[session.storeUrl] = meta;
  await AsyncStorage.setItem(KEY_CUSTOMER_SESSIONS, JSON.stringify(sessions));
}

export async function clearCustomerSession(storeUrl: string): Promise<void> {
  await safeDeleteSecureItem(toSafeStoreKey('mercato_jwt', storeUrl));
  const sessions = await getAsyncJson<Record<string, Omit<CustomerSession, 'jwtToken'>>>(
    KEY_CUSTOMER_SESSIONS,
    {},
  );
  delete sessions[storeUrl];
  await AsyncStorage.setItem(KEY_CUSTOMER_SESSIONS, JSON.stringify(sessions));
}

const KEY_CUSTOMER_ADDRESSES_PREFIX = 'mercato_customer_addresses_';

export async function loadCustomerAddresses(
  storeUrl: string,
  customerId?: number,
): Promise<CustomerAddress[]> {
  const key = `${KEY_CUSTOMER_ADDRESSES_PREFIX}${storeUrl}_${customerId || 'guest'}`;
  return getAsyncJson<CustomerAddress[]>(key, []);
}

export async function saveCustomerAddresses(
  storeUrl: string,
  addresses: CustomerAddress[],
  customerId?: number,
): Promise<void> {
  const key = `${KEY_CUSTOMER_ADDRESSES_PREFIX}${storeUrl}_${customerId || 'guest'}`;
  await AsyncStorage.setItem(key, JSON.stringify(addresses));
}

export async function loadAllCartItems(): Promise<CartItem[]> {
  return getAsyncJson<CartItem[]>(KEY_CART_ITEMS, []);
}

export async function saveAllCartItems(items: CartItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY_CART_ITEMS, JSON.stringify(items));
}

export async function loadAllWishlistItems(): Promise<WishlistItem[]> {
  return getAsyncJson<WishlistItem[]>(KEY_WISHLIST_ITEMS, []);
}

export async function saveAllWishlistItems(items: WishlistItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY_WISHLIST_ITEMS, JSON.stringify(items));
}

export async function loadThemeMode(): Promise<ThemeMode> {
  const raw = await AsyncStorage.getItem(KEY_THEME_MODE);
  if (raw === 'LIGHT' || raw === 'DARK' || raw === 'SYSTEM') return raw;
  return 'SYSTEM';
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(KEY_THEME_MODE, mode);
}

export async function loadHideDemoControls(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY_HIDE_DEMO);
  return raw === 'true';
}

export async function saveHideDemoControls(hide: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_HIDE_DEMO, hide ? 'true' : 'false');
}

export async function loadRecentOrderIds(storeUrl: string): Promise<number[]> {
  const map = await getAsyncJson<Record<string, number[]>>(KEY_RECENT_ORDER_IDS, {});
  return map[storeUrl] || [];
}

export async function saveRecentOrderId(storeUrl: string, orderId: number): Promise<number[]> {
  const map = await getAsyncJson<Record<string, number[]>>(KEY_RECENT_ORDER_IDS, {});
  const current = map[storeUrl] || [];
  const updated = [orderId, ...current.filter((id) => id !== orderId)].slice(0, 30);
  map[storeUrl] = updated;
  await AsyncStorage.setItem(KEY_RECENT_ORDER_IDS, JSON.stringify(map));
  return updated;
}
