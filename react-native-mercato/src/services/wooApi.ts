import {
  CatalogSortOption,
  CustomerAddress,
  CustomerSession,
  SORT_OPTIONS,
  StoreConfig,
  WooCoupon,
  WooOrderResponse,
  WooPaymentGateway,
  WooProduct,
  WooProductCategory,
  WooProductReview,
  WooProductVariation,
} from '../types/woo';
import { decodeEntities, htmlToPlainText } from '../utils/htmlParser';
import { normalizeStateCode } from '../utils/locationData';
import { validateAndNormalizeStoreUrl } from '../utils/urlValidator';
import { MobileConfigResponse, WpHomepageSections, WpThemeOptions } from '../types/mobileConfig';

const REQUEST_TIMEOUT_MS = 25000;

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeUtf8ToBase64(input: string): string {
  const utf8Bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      utf8Bytes.push(code);
    } else if (code < 0x800) {
      utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = 0x10000 + (((code - 0xd800) << 10) | (next - 0xdc00));
        utf8Bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
        i += 1;
      }
    } else {
      utf8Bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  let output = '';
  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const b0 = utf8Bytes[i];
    const b1 = i + 1 < utf8Bytes.length ? utf8Bytes[i + 1] : 0;
    const b2 = i + 2 < utf8Bytes.length ? utf8Bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;

    output += BASE64_CHARS[(triple >> 18) & 0x3f];
    output += BASE64_CHARS[(triple >> 12) & 0x3f];
    output += i + 1 < utf8Bytes.length ? BASE64_CHARS[(triple >> 6) & 0x3f] : '=';
    output += i + 2 < utf8Bytes.length ? BASE64_CHARS[triple & 0x3f] : '=';
  }
  return output;
}

function buildBasicAuth(username: string, password: string): string {
  return `Basic ${encodeUtf8ToBase64(`${username}:${password}`)}`;
}

function assertHttpsUrl(baseUrl: string): void {
  if (!baseUrl.toLowerCase().startsWith('https://')) {
    throw new Error('Only HTTPS WooCommerce endpoints are permitted.');
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  assertHttpsUrl(baseUrl);
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        search.set(key, String(val));
      }
    });
  }
  const qs = search.toString();
  return `${cleanBase}${cleanPath}${qs ? `?${qs}` : ''}`;
}

async function fetchJson<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
): Promise<T> {
  assertHttpsUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: any = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      let detailMsg = '';
      if (parsed?.data?.params && typeof parsed.data.params === 'object') {
        detailMsg = Object.entries(parsed.data.params)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
      }
      const serverMsg =
        detailMsg ||
        parsed?.message ||
        parsed?.data?.message ||
        (response.status === 401
          ? 'Authentication failed (HTTP 401). Check your API credentials or REST permissions.'
          : response.status === 403
            ? 'Access forbidden (HTTP 403). Ensure REST API permissions are enabled.'
            : response.status === 404
              ? 'WooCommerce REST endpoint not found (HTTP 404). Verify permalinks are enabled.'
              : `Store returned HTTP ${response.status}.`);
      throw new Error(htmlToPlainText(String(serverMsg)));
    }

    return parsed as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out after 25s. Please check your store connection.');
    }
    throw err instanceof Error ? err : new Error('Network request failed.');
  } finally {
    clearTimeout(timeout);
  }
}

function storeHeaders(store: Pick<StoreConfig, 'consumerKey' | 'consumerSecret'>): Record<string, string> {
  return {
    Authorization: buildBasicAuth(store.consumerKey, store.consumerSecret),
  };
}

export async function testAndConnectStore(params: {
  rawUrl: string;
  consumerKey: string;
  consumerSecret: string;
  customStoreName?: string;
}): Promise<StoreConfig> {
  const validation = validateAndNormalizeStoreUrl(params.rawUrl);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }
  const key = params.consumerKey.trim();
  const secret = params.consumerSecret.trim();
  if (!key || !secret) {
    throw new Error('Consumer Key and Consumer Secret are required.');
  }

  const baseUrl = validation.normalizedBaseUrl;
  const auth = { Authorization: buildBasicAuth(key, secret) };

  // 1. Validate WooCommerce API v3 access
  await fetchJson<WooProduct[]>(
    buildUrl(baseUrl, '/wp-json/wc/v3/products', { per_page: 1 }),
    { headers: auth },
  );

  // 2. Fetch store currency
  let currencySymbol = '$';
  let currencyCode = 'USD';
  try {
    const currency = await fetchJson<{ code?: string; symbol?: string }>(
      buildUrl(baseUrl, '/wp-json/wc/v3/data/currencies/current'),
      { headers: auth },
    );
    currencySymbol = decodeEntities(currency.symbol) || '$';
    currencyCode = currency.code || 'USD';
  } catch {
    // Fallback to USD if store blocks currency endpoint
  }

  // 3. Fetch WordPress site name & tagline
  let siteTitle = params.customStoreName?.trim() || '';
  if (siteTitle.toLowerCase() === 'my boutique') {
    siteTitle = '';
  }
  let tagline = 'Connected WooCommerce Store';
  try {
    const rootInfo = await fetchJson<{ name?: string; description?: string }>(
      buildUrl(baseUrl, '/wp-json/'),
    );
    if (!siteTitle && rootInfo.name) {
      siteTitle = decodeEntities(rootInfo.name);
    }
    if (rootInfo.description) {
      tagline = decodeEntities(rootInfo.description);
    }
  } catch {
    // Ignore public root lookup failure
  }

  if (!siteTitle || siteTitle.toLowerCase() === 'my boutique') {
    siteTitle = validation.host.replace(/^www\./i, '') || 'NextEcom Store';
  }

  return {
    storeUrl: baseUrl,
    storeName: siteTitle,
    consumerKey: key,
    consumerSecret: secret,
    currencySymbol,
    currencyCode,
    tagline,
    lastSyncedAt: Date.now(),
  };
}

export async function fetchHomeFeed(store: StoreConfig): Promise<{
  categories: WooProductCategory[];
  featured: WooProduct[];
  onSale: WooProduct[];
  latest: WooProduct[];
}> {
  const headers = storeHeaders(store);
  const [categories, featured, onSale, latest] = await Promise.all([
    fetchJson<WooProductCategory[]>(
      buildUrl(store.storeUrl, '/wp-json/wc/v3/products/categories', {
        per_page: 25,
        hide_empty: true,
        orderby: 'count',
        order: 'desc',
      }),
      { headers },
    ),
    fetchJson<WooProduct[]>(
      buildUrl(store.storeUrl, '/wp-json/wc/v3/products', {
        per_page: 10,
        featured: true,
        status: 'publish',
      }),
      { headers },
    ),
    fetchJson<WooProduct[]>(
      buildUrl(store.storeUrl, '/wp-json/wc/v3/products', {
        per_page: 10,
        on_sale: true,
        status: 'publish',
      }),
      { headers },
    ),
    fetchJson<WooProduct[]>(
      buildUrl(store.storeUrl, '/wp-json/wc/v3/products', {
        per_page: 16,
        orderby: 'date',
        order: 'desc',
        status: 'publish',
      }),
      { headers },
    ),
  ]);

  return { categories, featured, onSale, latest };
}

export async function fetchMobileConfig(store: StoreConfig): Promise<MobileConfigResponse | null> {
  try {
    return await fetchJson<MobileConfigResponse>(
      buildUrl(store.storeUrl, '/wp-json/nextecom/v1/mobile-config'),
    );
  } catch {
    return null;
  }
}

export async function fetchWpHomepageSections(store: StoreConfig): Promise<WpHomepageSections | null> {
  try {
    return await fetchJson<WpHomepageSections>(
      buildUrl(store.storeUrl, '/wp-json/nextecom/v1/homepage-sections'),
    );
  } catch {
    return null;
  }
}

export async function fetchThemeOptions(store: StoreConfig): Promise<WpThemeOptions | null> {
  try {
    return await fetchJson<WpThemeOptions>(
      buildUrl(store.storeUrl, '/wp-json/nextecom/v1/theme-options'),
    );
  } catch {
    return null;
  }
}

export async function fetchStoreLogo(store: StoreConfig): Promise<string> {
  try {
    // 1. Check root site_icon_url
    const rootInfo = await fetchJson<{ site_icon_url?: string }>(
      buildUrl(store.storeUrl, '/wp-json/'),
    );
    if (rootInfo?.site_icon_url) {
      return rootInfo.site_icon_url;
    }

    // 2. Query WordPress media library for uploaded logo
    const media = await fetchJson<Array<{ source_url?: string }>>(
      buildUrl(store.storeUrl, '/wp-json/wp/v2/media', {
        search: 'logo',
        per_page: 1,
      }),
    );
    if (media?.[0]?.source_url) {
      return media[0].source_url;
    }
  } catch {
    // Ignore network / media lookup failure
  }
  return '';
}

export async function fetchCategories(store: StoreConfig): Promise<WooProductCategory[]> {
  return fetchJson<WooProductCategory[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/products/categories', {
      per_page: 50,
      hide_empty: true,
      orderby: 'count',
      order: 'desc',
    }),
    { headers: storeHeaders(store) },
  );
}

export async function fetchProducts(
  store: StoreConfig,
  params: {
    page?: number;
    perPage?: number;
    search?: string;
    categoryId?: number | null;
    sort?: CatalogSortOption;
    onSale?: boolean;
    inStockOnly?: boolean;
    minPrice?: string;
    maxPrice?: string;
  },
): Promise<WooProduct[]> {
  const sortMeta = SORT_OPTIONS.find((s) => s.key === (params.sort || 'NEWEST')) || SORT_OPTIONS[0];
  return fetchJson<WooProduct[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/products', {
      page: params.page || 1,
      per_page: params.perPage || 20,
      search: params.search?.trim() || undefined,
      category: params.categoryId ?? undefined,
      orderby: sortMeta.orderby,
      order: sortMeta.order,
      on_sale: params.onSale ? true : undefined,
      stock_status: params.inStockOnly ? 'instock' : undefined,
      min_price: params.minPrice?.trim() || undefined,
      max_price: params.maxPrice?.trim() || undefined,
      status: 'publish',
    }),
    { headers: storeHeaders(store) },
  );
}

export async function fetchProductDetail(
  store: StoreConfig,
  productId: number,
): Promise<{
  product: WooProduct;
  variations: WooProductVariation[];
  reviews: WooProductReview[];
  related: WooProduct[];
}> {
  const headers = storeHeaders(store);
  const product = await fetchJson<WooProduct>(
    buildUrl(store.storeUrl, `/wp-json/wc/v3/products/${productId}`),
    { headers },
  );

  const variationsPromise =
    product.type === 'variable'
      ? fetchJson<WooProductVariation[]>(
          buildUrl(store.storeUrl, `/wp-json/wc/v3/products/${productId}/variations`, {
            per_page: 50,
          }),
          { headers },
        ).catch(() => [])
      : Promise.resolve<WooProductVariation[]>([]);

  const reviewsPromise = fetchJson<WooProductReview[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/products/reviews', {
      product: productId,
      per_page: 25,
    }),
    { headers },
  ).catch(() => []);

  const relatedIds = (product.related_ids || []).slice(0, 8);
  const relatedPromise =
    relatedIds.length > 0
      ? fetchJson<WooProduct[]>(
          buildUrl(store.storeUrl, '/wp-json/wc/v3/products', {
            include: relatedIds.join(','),
            per_page: 8,
            status: 'publish',
          }),
          { headers },
        ).catch(() => [])
      : Promise.resolve<WooProduct[]>([]);

  const [variations, reviews, related] = await Promise.all([
    variationsPromise,
    reviewsPromise,
    relatedPromise,
  ]);

  return { product, variations, reviews, related };
}

export async function submitProductReview(
  store: StoreConfig,
  params: {
    productId: number;
    reviewerName: string;
    reviewerEmail: string;
    reviewText: string;
    rating: number;
  },
): Promise<WooProductReview> {
  return fetchJson<WooProductReview>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/products/reviews'),
    {
      method: 'POST',
      headers: storeHeaders(store),
      body: {
        product_id: params.productId,
        reviewer: params.reviewerName.trim(),
        reviewer_email: params.reviewerEmail.trim(),
        review: params.reviewText.trim(),
        rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      },
    },
  );
}

export async function validateCoupon(store: StoreConfig, code: string): Promise<WooCoupon> {
  const cleanCode = code.trim();
  if (!cleanCode) {
    throw new Error('Please enter a coupon code.');
  }
  const coupons = await fetchJson<WooCoupon[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/coupons', { code: cleanCode }),
    { headers: storeHeaders(store) },
  );
  if (!coupons.length) {
    throw new Error(`Coupon "${cleanCode}" was not found or has expired.`);
  }
  return coupons[0];
}

export async function fetchEnabledPaymentGateways(
  store: StoreConfig,
): Promise<WooPaymentGateway[]> {
  const gateways = await fetchJson<WooPaymentGateway[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/payment_gateways'),
    { headers: storeHeaders(store) },
  );
  const enabled = gateways
    .filter((g) => g.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (enabled.length > 0) return enabled;
  return [
    {
      id: 'cod',
      title: 'Cash on Delivery',
      description: 'Pay upon delivery.',
      order: 0,
      enabled: true,
    },
  ];
}

export async function createOrder(
  store: StoreConfig,
  payload: {
    customerId?: number;
    email: string;
    billing: CustomerAddress;
    paymentMethodId: string;
    paymentMethodTitle: string;
    couponCode?: string | null;
    customerNote?: string;
    lineItems: { product_id: number; variation_id?: number; quantity: number }[];
  },
): Promise<WooOrderResponse> {
  const countryCode = payload.billing.country.trim().toUpperCase() || 'IN';
  const stateCode = normalizeStateCode(countryCode, payload.billing.state.trim());

  const addrPayload = {
    first_name: payload.billing.firstName.trim(),
    last_name: payload.billing.lastName.trim(),
    address_1: payload.billing.address1.trim(),
    city: payload.billing.city.trim(),
    state: stateCode,
    postcode: payload.billing.postcode.trim(),
    country: countryCode,
    email: payload.email.trim(),
    phone: payload.billing.phone.trim(),
  };

  return fetchJson<WooOrderResponse>(buildUrl(store.storeUrl, '/wp-json/wc/v3/orders'), {
    method: 'POST',
    headers: storeHeaders(store),
    body: {
      customer_id: payload.customerId || 0,
      payment_method: payload.paymentMethodId,
      payment_method_title: payload.paymentMethodTitle,
      set_paid: false,
      customer_note: payload.customerNote?.trim() || undefined,
      billing: addrPayload,
      shipping: {
        first_name: addrPayload.first_name,
        last_name: addrPayload.last_name,
        address_1: addrPayload.address_1,
        city: addrPayload.city,
        state: addrPayload.state,
        postcode: addrPayload.postcode,
        country: addrPayload.country,
      },
      line_items: payload.lineItems,
      coupon_lines: payload.couponCode ? [{ code: payload.couponCode.trim() }] : [],
    },
  });
}

export async function fetchOrders(
  store: StoreConfig,
  params: { customerId?: number; recentOrderIds?: number[] },
): Promise<WooOrderResponse[]> {
  const headers = storeHeaders(store);
  if (params.customerId && params.customerId > 0) {
    return fetchJson<WooOrderResponse[]>(
      buildUrl(store.storeUrl, '/wp-json/wc/v3/orders', {
        customer: params.customerId,
        per_page: 20,
      }),
      { headers },
    );
  }
  const ids = params.recentOrderIds || [];
  if (ids.length === 0) return [];
  return fetchJson<WooOrderResponse[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/orders', {
      include: ids.slice(0, 20).join(','),
      per_page: 20,
    }),
    { headers },
  );
}

export async function lookupOrderById(
  store: StoreConfig,
  orderId: number,
): Promise<WooOrderResponse> {
  return fetchJson<WooOrderResponse>(
    buildUrl(store.storeUrl, `/wp-json/wc/v3/orders/${orderId}`),
    { headers: storeHeaders(store) },
  );
}

interface WooCustomerApiResponse {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    phone?: string;
  };
}

function mapCustomerToSession(
  storeUrl: string,
  customer: WooCustomerApiResponse,
  jwtToken = '',
): CustomerSession {
  const b = customer.billing || {};
  return {
    storeUrl,
    customerId: customer.id,
    email: customer.email || '',
    username: customer.username || '',
    firstName: customer.first_name || b.first_name || '',
    lastName: customer.last_name || b.last_name || '',
    avatarUrl: customer.avatar_url || '',
    jwtToken,
    billing: {
      firstName: b.first_name || customer.first_name || '',
      lastName: b.last_name || customer.last_name || '',
      address1: b.address_1 || '',
      city: b.city || '',
      state: b.state || '',
      postcode: b.postcode || '',
      country: b.country || 'US',
      phone: b.phone || '',
    },
  };
}

export async function loginCustomer(
  store: StoreConfig,
  usernameOrEmail: string,
  password: string,
): Promise<CustomerSession> {
  const identifier = usernameOrEmail.trim();
  if (!identifier || !password) {
    throw new Error('Username/Email and password are required.');
  }

  let jwtToken = '';
  let wpEmail = identifier.includes('@') ? identifier : '';
  let wpUserId = 0;

  // 1. Try WordPress JWT Auth plugin endpoint
  try {
    const jwtRes = await fetchJson<{
      token?: string;
      user_email?: string;
      user_display_name?: string;
    }>(buildUrl(store.storeUrl, '/wp-json/jwt-auth/v1/token'), {
      method: 'POST',
      body: { username: identifier, password },
    });
    if (!jwtRes.token) {
      throw new Error('Invalid WordPress JWT response.');
    }
    jwtToken = jwtRes.token;
    if (jwtRes.user_email) wpEmail = jwtRes.user_email;

    try {
      const me = await fetchJson<{ id?: number; email?: string }>(
        buildUrl(store.storeUrl, '/wp-json/wp/v2/users/me', { context: 'edit' }),
        { headers: { Authorization: `Bearer ${jwtToken}` } },
      );
      if (me.id) wpUserId = me.id;
      if (me.email) wpEmail = me.email;
    } catch {
      // Optional user hydration
    }
  } catch (jwtErr: any) {
    // 2. Fallback to WordPress Application Password / Basic Auth on /wp/v2/users/me
    const wpAuth = buildBasicAuth(identifier, password);
    try {
      const me = await fetchJson<{
        id: number;
        email?: string;
        username?: string;
        name?: string;
        avatar_urls?: Record<string, string>;
      }>(buildUrl(store.storeUrl, '/wp-json/wp/v2/users/me', { context: 'edit' }), {
        headers: { Authorization: wpAuth },
      });
      wpUserId = me.id;
      if (me.email) wpEmail = me.email;
    } catch {
      const msg = jwtErr instanceof Error ? jwtErr.message : '';
      throw new Error(
        msg ||
          'Sign-in failed. Ensure JWT Authentication for WP REST API or WordPress Application Passwords is enabled on your site.',
      );
    }
  }

  // 3. Hydrate full WooCommerce customer record
  const headers = storeHeaders(store);
  if (wpUserId > 0) {
    try {
      const cust = await fetchJson<WooCustomerApiResponse>(
        buildUrl(store.storeUrl, `/wp-json/wc/v3/customers/${wpUserId}`),
        { headers },
      );
      return mapCustomerToSession(store.storeUrl, cust, jwtToken);
    } catch {
      // Fallback to search below
    }
  }

  const searchTerm = wpEmail || identifier;
  const matches = await fetchJson<WooCustomerApiResponse[]>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/customers', {
      email: wpEmail || undefined,
      search: wpEmail ? undefined : searchTerm,
      per_page: 5,
    }),
    { headers },
  );

  const matched =
    matches.find(
      (c) =>
        c.email.toLowerCase() === searchTerm.toLowerCase() ||
        c.username.toLowerCase() === identifier.toLowerCase(),
    ) || matches[0];

  if (!matched) {
    throw new Error('WordPress user authenticated, but no matching WooCommerce customer record was found.');
  }

  return mapCustomerToSession(store.storeUrl, matched, jwtToken);
}

export async function registerCustomer(
  store: StoreConfig,
  params: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
  },
): Promise<CustomerSession> {
  if (!params.email.trim() || !params.username.trim() || params.password.length < 6) {
    throw new Error('Valid email, username, and password (min 6 chars) are required.');
  }

  const created = await fetchJson<WooCustomerApiResponse>(
    buildUrl(store.storeUrl, '/wp-json/wc/v3/customers'),
    {
      method: 'POST',
      headers: storeHeaders(store),
      body: {
        email: params.email.trim(),
        username: params.username.trim(),
        password: params.password,
        first_name: params.firstName.trim(),
        last_name: params.lastName.trim(),
        billing: {
          first_name: params.firstName.trim(),
          last_name: params.lastName.trim(),
          email: params.email.trim(),
        },
        shipping: {
          first_name: params.firstName.trim(),
          last_name: params.lastName.trim(),
        },
      },
    },
  );

  return mapCustomerToSession(store.storeUrl, created, '');
}

export async function updateCustomerProfile(
  store: StoreConfig,
  session: CustomerSession,
  params: {
    firstName: string;
    lastName: string;
    billing: CustomerAddress;
  },
): Promise<CustomerSession> {
  const updated = await fetchJson<WooCustomerApiResponse>(
    buildUrl(store.storeUrl, `/wp-json/wc/v3/customers/${session.customerId}`),
    {
      method: 'PUT',
      headers: storeHeaders(store),
      body: {
        first_name: params.firstName.trim(),
        last_name: params.lastName.trim(),
        billing: {
          first_name: params.billing.firstName.trim(),
          last_name: params.billing.lastName.trim(),
          address_1: params.billing.address1.trim(),
          city: params.billing.city.trim(),
          state: params.billing.state.trim(),
          postcode: params.billing.postcode.trim(),
          country: params.billing.country.trim().toUpperCase() || 'US',
          phone: params.billing.phone.trim(),
          email: session.email,
        },
        shipping: {
          first_name: params.billing.firstName.trim(),
          last_name: params.billing.lastName.trim(),
          address_1: params.billing.address1.trim(),
          city: params.billing.city.trim(),
          state: params.billing.state.trim(),
          postcode: params.billing.postcode.trim(),
          country: params.billing.country.trim().toUpperCase() || 'US',
        },
      },
    },
  );
  return mapCustomerToSession(store.storeUrl, updated, session.jwtToken);
}

export async function refreshCustomerProfile(
  store: StoreConfig,
  session: CustomerSession,
): Promise<CustomerSession> {
  const fresh = await fetchJson<WooCustomerApiResponse>(
    buildUrl(store.storeUrl, `/wp-json/wc/v3/customers/${session.customerId}`),
    { headers: storeHeaders(store) },
  );
  return mapCustomerToSession(store.storeUrl, fresh, session.jwtToken);
}
