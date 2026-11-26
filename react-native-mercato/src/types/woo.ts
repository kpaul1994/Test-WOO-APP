export type ThemeMode = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface StoreConfig {
  storeUrl: string;
  storeName: string;
  consumerKey: string;
  consumerSecret: string;
  currencySymbol: string;
  currencyCode: string;
  tagline: string;
  lastSyncedAt: number;
}

export interface CustomerAddress {
  id?: string;
  label?: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface CustomerSession {
  storeUrl: string;
  customerId: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  jwtToken: string;
  billing: CustomerAddress;
}

export interface WooProductImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WooCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface WooProductAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  average_rating: string;
  rating_count: number;
  categories: WooCategoryRef[];
  images: WooProductImage[];
  attributes: WooProductAttribute[];
  variations: number[];
  related_ids: number[];
}

export interface WooProductCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  image?: WooProductImage | null;
  count: number;
}

export interface WooVariationAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooProductVariation {
  id: number;
  description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  image?: WooProductImage | null;
  attributes: WooVariationAttribute[];
}

export interface WooProductReview {
  id: number;
  date_created: string;
  review: string;
  rating: number;
  reviewer: string;
  verified: boolean;
}

export interface WooCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: string;
  description: string;
  minimum_amount: string;
}

export interface WooPaymentGateway {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
}

export interface WooOrderLineItemResponse {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  total: string;
}

export interface WooOrderResponse {
  id: number;
  customer_id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  discount_total: string;
  shipping_total: string;
  total: string;
  payment_method: string;
  payment_method_title: string;
  payment_url?: string | null;
  line_items: WooOrderLineItemResponse[];
}

export interface CartItem {
  localId: string;
  storeUrl: string;
  productId: number;
  variationId?: number;
  name: string;
  imageUrl: string;
  price: number;
  regularPrice?: number;
  variantSummary: string;
  sku: string;
  quantity: number;
}

export interface WishlistItem {
  storeUrl: string;
  productId: number;
  name: string;
  imageUrl: string;
  price: number;
  regularPrice?: number;
  onSale: boolean;
  averageRating: string;
  categoryName: string;
}

export type CatalogSortOption = 'NEWEST' | 'POPULAR' | 'TOP_RATED' | 'PRICE_LOW' | 'PRICE_HIGH';

export const SORT_OPTIONS: { key: CatalogSortOption; label: string; orderby: string; order: string }[] = [
  { key: 'NEWEST', label: 'Newest', orderby: 'date', order: 'desc' },
  { key: 'POPULAR', label: 'Popular', orderby: 'popularity', order: 'desc' },
  { key: 'TOP_RATED', label: 'Top Rated', orderby: 'rating', order: 'desc' },
  { key: 'PRICE_LOW', label: 'Price: Low to High', orderby: 'price', order: 'asc' },
  { key: 'PRICE_HIGH', label: 'Price: High to Low', orderby: 'price', order: 'desc' },
];
