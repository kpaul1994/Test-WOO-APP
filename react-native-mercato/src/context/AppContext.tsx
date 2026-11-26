import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { ENV } from '../config/env';
import * as storage from '../services/storage';
import * as wooApi from '../services/wooApi';
import { DarkColors, LightColors, MercatoColors } from '../theme/theme';
import {
  CartItem,
  CustomerAddress,
  CustomerSession,
  StoreConfig,
  ThemeMode,
  WooOrderResponse,
  WooProduct,
  WooProductVariation,
  WishlistItem,
} from '../types/woo';
import { decodeEntities } from '../utils/htmlParser';

interface AppContextValue {
  bootstrapping: boolean;
  activeStore: StoreConfig | null;
  savedStores: StoreConfig[];
  activeCustomer: CustomerSession | null;
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  wishlistItems: WishlistItem[];
  wishlistIds: Set<number>;
  themeMode: ThemeMode;
  isDark: boolean;
  colors: MercatoColors;
  hideDemoControls: boolean;
  showDemoStoreControls: boolean;
  recentOrderIds: number[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  dismissToast: () => void;
  connectStore: (params: {
    rawUrl: string;
    consumerKey: string;
    consumerSecret: string;
    customStoreName?: string;
  }) => Promise<StoreConfig>;
  switchStore: (storeUrl: string) => Promise<void>;
  disconnectStore: () => Promise<void>;
  removeSavedStore: (storeUrl: string) => Promise<void>;
  addToCart: (product: WooProduct, variation?: WooProductVariation | null, quantity?: number) => void;
  updateCartQuantity: (localId: string, delta: number) => void;
  removeCartItem: (localId: string) => void;
  clearStoreCart: () => void;
  toggleWishlist: (product: WooProduct) => void;
  removeWishlistItem: (productId: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHideDemoControls: (hide: boolean) => void;
  loginCustomer: (usernameOrEmail: string, password: string) => Promise<CustomerSession>;
  registerCustomer: (params: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
  }) => Promise<CustomerSession>;
  updateCustomerProfile: (params: {
    firstName: string;
    lastName: string;
    billing: CustomerAddress;
  }) => Promise<CustomerSession>;
  refreshCustomerProfile: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  recordOrderId: (orderId: number) => Promise<void>;
  placeOrder: (params: {
    email: string;
    billing: CustomerAddress;
    paymentMethodId: string;
    paymentMethodTitle: string;
    couponCode?: string | null;
    customerNote?: string;
  }) => Promise<WooOrderResponse>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [savedStores, setSavedStores] = useState<StoreConfig[]>([]);
  const [activeStoreUrl, setActiveStoreUrlState] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<CustomerSession | null>(null);
  const [allCartItems, setAllCartItems] = useState<CartItem[]>([]);
  const [allWishlistItems, setAllWishlistItems] = useState<WishlistItem[]>([]);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('SYSTEM');
  const [hideDemoControls, setHideDemoControlsState] = useState(false);
  const [recentOrderIds, setRecentOrderIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stores, activeUrl, cart, wishlist, theme, hideDemo] = await Promise.all([
          storage.loadSavedStores(),
          storage.getActiveStoreUrl(),
          storage.loadAllCartItems(),
          storage.loadAllWishlistItems(),
          storage.loadThemeMode(),
          storage.loadHideDemoControls(),
        ]);

        if (!mounted) return;
        setSavedStores(stores);
        const resolvedUrl =
          activeUrl && stores.some((s) => s.storeUrl === activeUrl)
            ? activeUrl
            : stores[0]?.storeUrl || null;
        setActiveStoreUrlState(resolvedUrl);
        setAllCartItems(cart);
        setAllWishlistItems(wishlist);
        setThemeModeState(theme);
        setHideDemoControlsState(hideDemo);

        if (resolvedUrl) {
          const [session, orders] = await Promise.all([
            storage.loadCustomerSession(resolvedUrl),
            storage.loadRecentOrderIds(resolvedUrl),
          ]);
          if (mounted) {
            setActiveCustomer(session);
            setRecentOrderIds(orders);
          }
        }
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activeStore = useMemo(
    () => savedStores.find((s) => s.storeUrl === activeStoreUrl) || null,
    [savedStores, activeStoreUrl],
  );

  const cartItems = useMemo(
    () => (activeStore ? allCartItems.filter((c) => c.storeUrl === activeStore.storeUrl) : []),
    [allCartItems, activeStore],
  );

  const wishlistItems = useMemo(
    () =>
      activeStore ? allWishlistItems.filter((w) => w.storeUrl === activeStore.storeUrl) : [],
    [allWishlistItems, activeStore],
  );

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((w) => w.productId)),
    [wishlistItems],
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const isDark =
    themeMode === 'DARK' || (themeMode === 'SYSTEM' && systemScheme === 'dark');
  const colors = isDark ? DarkColors : LightColors;
  const showDemoStoreControls = ENV.SHOW_STORE_SETUP && !hideDemoControls;

  const hydrateStoreScopedData = useCallback(async (storeUrl: string | null) => {
    if (!storeUrl) {
      setActiveCustomer(null);
      setRecentOrderIds([]);
      return;
    }
    const [session, orders] = await Promise.all([
      storage.loadCustomerSession(storeUrl),
      storage.loadRecentOrderIds(storeUrl),
    ]);
    setActiveCustomer(session);
    setRecentOrderIds(orders);
  }, []);

  const connectStore = useCallback(
    async (params: {
      rawUrl: string;
      consumerKey: string;
      consumerSecret: string;
      customStoreName?: string;
    }) => {
      const config = await wooApi.testAndConnectStore(params);
      const updatedStores = await storage.saveStoreConfig(config);
      setSavedStores(updatedStores);
      setActiveStoreUrlState(config.storeUrl);
      await hydrateStoreScopedData(config.storeUrl);
      showToast(`Connected to ${config.storeName}`);
      return config;
    },
    [hydrateStoreScopedData, showToast],
  );

  const switchStore = useCallback(
    async (storeUrl: string) => {
      await storage.setActiveStoreUrl(storeUrl);
      setActiveStoreUrlState(storeUrl);
      await hydrateStoreScopedData(storeUrl);
    },
    [hydrateStoreScopedData],
  );

  const disconnectStore = useCallback(async () => {
    await storage.setActiveStoreUrl(null);
    setActiveStoreUrlState(null);
    setActiveCustomer(null);
    setRecentOrderIds([]);
  }, []);

  const removeSavedStore = useCallback(
    async (storeUrl: string) => {
      const remaining = await storage.deleteSavedStore(storeUrl);
      setSavedStores(remaining);
      if (activeStoreUrl === storeUrl) {
        const nextUrl = remaining[0]?.storeUrl || null;
        setActiveStoreUrlState(nextUrl);
        await hydrateStoreScopedData(nextUrl);
      }
      showToast('Store removed');
    },
    [activeStoreUrl, hydrateStoreScopedData, showToast],
  );

  const persistCart = useCallback((next: CartItem[]) => {
    setAllCartItems(next);
    storage.saveAllCartItems(next).catch(() => {});
  }, []);

  const addToCart = useCallback(
    (product: WooProduct, variation?: WooProductVariation | null, quantity = 1) => {
      if (!activeStore) return;
      const variationId = variation?.id;
      const localId = `${activeStore.storeUrl}__${product.id}__${variationId || 0}`;
      const rawPrice = Number(variation?.price || product.price || product.regular_price || 0);
      const rawReg = Number(variation?.regular_price || product.regular_price || 0);
      const variantSummary = variation
        ? variation.attributes.map((a) => `${a.name}: ${a.option}`).join(' • ')
        : '';
      const imageUrl = variation?.image?.src || product.images[0]?.src || '';

      const existing = allCartItems.find((item) => item.localId === localId);
      if (existing) {
        const next = allCartItems.map((item) =>
          item.localId === localId
            ? { ...item, quantity: item.quantity + Math.max(1, quantity) }
            : item,
        );
        persistCart(next);
      } else {
        const newItem: CartItem = {
          localId,
          storeUrl: activeStore.storeUrl,
          productId: product.id,
          variationId,
          name: decodeEntities(product.name),
          imageUrl,
          price: Number.isFinite(rawPrice) ? rawPrice : 0,
          regularPrice: rawReg > 0 ? rawReg : undefined,
          variantSummary,
          sku: variation?.sku || product.sku || '',
          quantity: Math.max(1, quantity),
        };
        persistCart([newItem, ...allCartItems]);
      }
      showToast(`${decodeEntities(product.name)} added to bag`);
    },
    [activeStore, allCartItems, persistCart, showToast],
  );

  const updateCartQuantity = useCallback(
    (localId: string, delta: number) => {
      const target = allCartItems.find((c) => c.localId === localId);
      if (!target) return;
      const nextQty = target.quantity + delta;
      if (nextQty <= 0) {
        persistCart(allCartItems.filter((c) => c.localId !== localId));
      } else {
        persistCart(
          allCartItems.map((c) => (c.localId === localId ? { ...c, quantity: nextQty } : c)),
        );
      }
    },
    [allCartItems, persistCart],
  );

  const removeCartItem = useCallback(
    (localId: string) => {
      persistCart(allCartItems.filter((c) => c.localId !== localId));
    },
    [allCartItems, persistCart],
  );

  const clearStoreCart = useCallback(() => {
    if (!activeStore) return;
    persistCart(allCartItems.filter((c) => c.storeUrl !== activeStore.storeUrl));
  }, [activeStore, allCartItems, persistCart]);

  const persistWishlist = useCallback((next: WishlistItem[]) => {
    setAllWishlistItems(next);
    storage.saveAllWishlistItems(next).catch(() => {});
  }, []);

  const toggleWishlist = useCallback(
    (product: WooProduct) => {
      if (!activeStore) return;
      const exists = allWishlistItems.some(
        (w) => w.storeUrl === activeStore.storeUrl && w.productId === product.id,
      );
      if (exists) {
        persistWishlist(
          allWishlistItems.filter(
            (w) => !(w.storeUrl === activeStore.storeUrl && w.productId === product.id),
          ),
        );
        showToast('Removed from Saved');
      } else {
        const price = Number(product.price || product.regular_price || 0);
        const reg = Number(product.regular_price || 0);
        const item: WishlistItem = {
          storeUrl: activeStore.storeUrl,
          productId: product.id,
          name: decodeEntities(product.name),
          imageUrl: product.images[0]?.src || '',
          price: Number.isFinite(price) ? price : 0,
          regularPrice: reg > 0 ? reg : undefined,
          onSale: product.on_sale,
          averageRating: product.average_rating || '0',
          categoryName: decodeEntities(product.categories[0]?.name || 'Collection'),
        };
        persistWishlist([item, ...allWishlistItems]);
        showToast('Saved to wishlist');
      }
    },
    [activeStore, allWishlistItems, persistWishlist, showToast],
  );

  const removeWishlistItem = useCallback(
    (productId: number) => {
      if (!activeStore) return;
      persistWishlist(
        allWishlistItems.filter(
          (w) => !(w.storeUrl === activeStore.storeUrl && w.productId === productId),
        ),
      );
    },
    [activeStore, allWishlistItems, persistWishlist],
  );

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storage.saveThemeMode(mode).catch(() => {});
  }, []);

  const setHideDemoControls = useCallback((hide: boolean) => {
    setHideDemoControlsState(hide);
    storage.saveHideDemoControls(hide).catch(() => {});
  }, []);

  const loginCustomer = useCallback(
    async (usernameOrEmail: string, password: string) => {
      if (!activeStore) throw new Error('No store connected.');
      const session = await wooApi.loginCustomer(activeStore, usernameOrEmail, password);
      await storage.saveCustomerSession(session);
      setActiveCustomer(session);
      showToast(`Welcome back, ${session.firstName || session.username}`);
      return session;
    },
    [activeStore, showToast],
  );

  const registerCustomer = useCallback(
    async (params: {
      firstName: string;
      lastName: string;
      email: string;
      username: string;
      password: string;
    }) => {
      if (!activeStore) throw new Error('No store connected.');
      const session = await wooApi.registerCustomer(activeStore, params);
      await storage.saveCustomerSession(session);
      setActiveCustomer(session);
      showToast('Account created & connected');
      return session;
    },
    [activeStore, showToast],
  );

  const updateCustomerProfile = useCallback(
    async (params: { firstName: string; lastName: string; billing: CustomerAddress }) => {
      if (!activeStore || !activeCustomer) {
        throw new Error('Sign in required to update profile.');
      }
      const updated = await wooApi.updateCustomerProfile(activeStore, activeCustomer, params);
      await storage.saveCustomerSession(updated);
      setActiveCustomer(updated);
      showToast('Profile & shipping address saved');
      return updated;
    },
    [activeStore, activeCustomer, showToast],
  );

  const refreshCustomerProfile = useCallback(async () => {
    if (!activeStore || !activeCustomer) return;
    const fresh = await wooApi.refreshCustomerProfile(activeStore, activeCustomer);
    await storage.saveCustomerSession(fresh);
    setActiveCustomer(fresh);
  }, [activeStore, activeCustomer]);

  const logoutCustomer = useCallback(async () => {
    if (!activeStore) return;
    await storage.clearCustomerSession(activeStore.storeUrl);
    setActiveCustomer(null);
    showToast('Signed out');
  }, [activeStore, showToast]);

  const recordOrderId = useCallback(
    async (orderId: number) => {
      if (!activeStore) return;
      const updated = await storage.saveRecentOrderId(activeStore.storeUrl, orderId);
      setRecentOrderIds(updated);
    },
    [activeStore],
  );

  const placeOrder = useCallback(
    async (params: {
      email: string;
      billing: CustomerAddress;
      paymentMethodId: string;
      paymentMethodTitle: string;
      couponCode?: string | null;
      customerNote?: string;
    }) => {
      if (!activeStore) throw new Error('No store connected.');
      if (cartItems.length === 0) throw new Error('Your shopping bag is empty.');

      const order = await wooApi.createOrder(activeStore, {
        customerId: activeCustomer?.customerId,
        email: params.email,
        billing: params.billing,
        paymentMethodId: params.paymentMethodId,
        paymentMethodTitle: params.paymentMethodTitle,
        couponCode: params.couponCode,
        customerNote: params.customerNote,
        lineItems: cartItems.map((item) => ({
          product_id: item.productId,
          variation_id: item.variationId,
          quantity: item.quantity,
        })),
      });

      const updatedIds = await storage.saveRecentOrderId(activeStore.storeUrl, order.id);
      setRecentOrderIds(updatedIds);
      clearStoreCart();
      return order;
    },
    [activeStore, activeCustomer, cartItems, clearStoreCart],
  );

  const value: AppContextValue = {
    bootstrapping,
    activeStore,
    savedStores,
    activeCustomer,
    cartItems,
    cartCount,
    cartSubtotal,
    wishlistItems,
    wishlistIds,
    themeMode,
    isDark,
    colors,
    hideDemoControls,
    showDemoStoreControls,
    recentOrderIds,
    toastMessage,
    showToast,
    dismissToast,
    connectStore,
    switchStore,
    disconnectStore,
    removeSavedStore,
    addToCart,
    updateCartQuantity,
    removeCartItem,
    clearStoreCart,
    toggleWishlist,
    removeWishlistItem,
    setThemeMode,
    setHideDemoControls,
    loginCustomer,
    registerCustomer,
    updateCustomerProfile,
    refreshCustomerProfile,
    logoutCustomer,
    recordOrderId,
    placeOrder,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
