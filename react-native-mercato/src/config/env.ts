import { StoreConfig } from '../types/woo';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeUrl: 'https://outsource2india.org/nextecom/wp',
  storeName: 'NextEcom',
  consumerKey: 'ck_1460120c29dd219b8a634f400b1e759b2d7d58a5',
  consumerSecret: 'cs_66c10a305c24972162569eff75af334948b8ea99',
  currencySymbol: '$',
  currencyCode: 'USD',
  tagline: 'Premium Dynamic Shopping',
  lastSyncedAt: 1732617600000,
};

export const ENV = {
  // Automatically hides demo API key / store-switching settings in production release builds
  SHOW_STORE_SETUP: typeof __DEV__ !== 'undefined' ? __DEV__ : true,
  DEFAULT_STORE: DEFAULT_STORE_CONFIG,
};
