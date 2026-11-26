# Mercato — React Native (Expo + TypeScript) WooCommerce Storefront

A 1-to-1 React Native conversion of the **Mercato** WooCommerce + WordPress storefront app.

## Features
- Connect any HTTPS WooCommerce store URL + REST API (`ck_...` / `cs_...`)
- Encrypted credential & JWT storage via `expo-secure-store`
- Home Feed (Categories, Special Offers, Featured Highlights, Latest Arrivals)
- Explore Catalog (Debounced Search, Category Filter, Sort & Price Filter, Pagination)
- Product Detail (Image Gallery, Dynamic Variations, Customer Reviews + Review Submission, Related Products)
- Store-scoped Wishlist & Shopping Bag with live WooCommerce Coupon validation
- Checkout with auto-filled Customer Address, live WooCommerce Payment Gateways, Order creation & Online Payment URL support
- WordPress Sign In (JWT Auth / Application Passwords), WooCommerce Customer Registration, Profile & Address Sync, and Order History
- Production Demo Hiding (`SHOW_STORE_SETUP = __DEV__` in `src/config/env.ts` + in-app preview switch)

## Run Locally
```bash
cd react-native-mercato
npm install
npx expo start
```
