import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import { WooProduct, WooProductCategory } from '../types/woo';
import { decodeEntities } from '../utils/htmlParser';

const STORE_BANNER = require('../../assets/img_store_banner.jpg');

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const {
    activeStore,
    colors,
    wishlistIds,
    toggleWishlist,
    addToCart,
    showDemoStoreControls,
  } = useApp();
  const navigation = useNavigation<HomeNavProp>();

  const [categories, setCategories] = useState<WooProductCategory[]>([]);
  const [featured, setFeatured] = useState<WooProduct[]>([]);
  const [onSale, setOnSale] = useState<WooProduct[]>([]);
  const [latest, setLatest] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(
    async (isRefresh = false) => {
      if (!activeStore) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await wooApi.fetchHomeFeed(activeStore);
        setCategories(data.categories);
        setFeatured(data.featured);
        setOnSale(data.onSale);
        setLatest(data.latest);
      } catch (err: any) {
        setError(err?.message || 'Unable to load store catalog.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStore],
  );

  useEffect(() => {
    loadFeed(false);
  }, [loadFeed]);

  if (!activeStore) return null;

  const gridCardWidth = (Dimensions.get('window').width - 36 - 12) / 2;
  const currency = activeStore.currencySymbol;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.outlineVariant },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.storeName, { color: colors.onBackground }]}>
            {activeStore.storeName}
          </Text>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.tertiary }]} />
            <Text numberOfLines={1} style={[styles.storeHost, { color: colors.onSurfaceVariant }]}>
              {activeStore.storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('Explore')}
            style={[styles.iconBtn, { backgroundColor: colors.surfaceVariant }]}
            accessibilityLabel="Search products"
          >
            <Ionicons name="search" size={20} color={colors.onSurface} />
          </Pressable>
          {showDemoStoreControls ? (
            <Pressable
              onPress={() => navigation.navigate('ConnectStore', { allowCancel: true })}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceVariant }]}
              accessibilityLabel="Switch WooCommerce store"
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.onSurface} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading && latest.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            Syncing {activeStore.storeName}...
          </Text>
        </View>
      ) : error && latest.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.onSurfaceVariant} />
          <Text style={[styles.errorTitle, { color: colors.onBackground }]}>
            Couldn&apos;t load storefront
          </Text>
          <Text style={[styles.errorSub, { color: colors.onSurfaceVariant }]}>{error}</Text>
          <Pressable
            onPress={() => loadFeed(false)}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.retryBtnText, { color: colors.onPrimary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFeed(true)}
              tintColor={colors.secondary}
            />
          }
        >
          {/* Hero Editorial Banner */}
          <Pressable
            onPress={() => navigation.navigate('Explore')}
            style={styles.bannerWrap}
          >
            <Image source={STORE_BANNER} style={styles.bannerImg} resizeMode="cover" />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerKicker}>CURATED STOREFRONT</Text>
              <Text numberOfLines={2} style={styles.bannerTitle}>
                {activeStore.tagline || `Explore ${activeStore.storeName}`}
              </Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>Shop Collection</Text>
                <Ionicons name="arrow-forward" size={14} color="#181615" />
              </View>
            </View>
          </Pressable>

          {/* Categories Rail */}
          {categories.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                  Categories
                </Text>
                <Pressable onPress={() => navigation.navigate('Explore')}>
                  <Text style={[styles.seeAll, { color: colors.secondary }]}>View all</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.railPad}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => navigation.navigate('Explore', { initialCategoryId: cat.id })}
                    style={[
                      styles.catPill,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                  >
                    {cat.image?.src ? (
                      <Image source={{ uri: cat.image.src }} style={styles.catThumb} />
                    ) : (
                      <View
                        style={[
                          styles.catThumb,
                          {
                            backgroundColor: colors.primaryContainer,
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                        ]}
                      >
                        <Ionicons
                          name="pricetag-outline"
                          size={14}
                          color={colors.onPrimaryContainer}
                        />
                      </View>
                    )}
                    <Text style={[styles.catLabel, { color: colors.onSurface }]}>
                      {decodeEntities(cat.name)}
                    </Text>
                    <Text style={[styles.catCount, { color: colors.onSurfaceVariant }]}>
                      {cat.count}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Special Offers Rail */}
          {onSale.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                  Special Offers
                </Text>
                <Pressable onPress={() => navigation.navigate('Explore')}>
                  <Text style={[styles.seeAll, { color: colors.secondary }]}>See deals</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.railPad}
              >
                {onSale.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    currencySymbol={currency}
                    isWishlisted={wishlistIds.has(item.id)}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                    onToggleWishlist={() => toggleWishlist(item)}
                    onQuickAdd={() => addToCart(item)}
                    style={{ width: 176 }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Featured Highlights Rail */}
          {featured.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                  Featured Highlights
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.railPad}
              >
                {featured.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    currencySymbol={currency}
                    isWishlisted={wishlistIds.has(item.id)}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                    onToggleWishlist={() => toggleWishlist(item)}
                    onQuickAdd={() => addToCart(item)}
                    style={{ width: 176 }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Latest Arrivals 2-Column Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                Latest Arrivals
              </Text>
              <Pressable onPress={() => navigation.navigate('Explore')}>
                <Text style={[styles.seeAll, { color: colors.secondary }]}>Browse all</Text>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {latest.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  currencySymbol={currency}
                  isWishlisted={wishlistIds.has(item.id)}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                  onToggleWishlist={() => toggleWishlist(item)}
                  onQuickAdd={() => addToCart(item)}
                  style={{ width: gridCardWidth }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    gap: 12,
  },
  storeName: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  storeHost: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
  },
  errorTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  errorSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  retryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 28,
    gap: 22,
  },
  bannerWrap: {
    marginHorizontal: 18,
    marginTop: 14,
    height: 176,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,22,21,0.48)',
    padding: 20,
    justifyContent: 'flex-end',
    gap: 6,
  },
  bannerKicker: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#FCE7E0',
  },
  bannerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    lineHeight: 25,
    color: '#FAF8F5',
  },
  bannerCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bannerCtaText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#181615',
  },
  section: { gap: 12 },
  sectionHeader: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 19,
  },
  seeAll: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  railPad: {
    paddingHorizontal: 18,
    gap: 12,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  catThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  catLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  catCount: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  grid: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
