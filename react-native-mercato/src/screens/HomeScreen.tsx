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
import { MobileConfigResponse, MobileSectionConfig, WpHomepageSections, WpThemeOptions } from '../types/mobileConfig';
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
  const [mobileConfig, setMobileConfig] = useState<MobileConfigResponse | null>(null);
  const [wpSections, setWpSections] = useState<WpHomepageSections | null>(null);
  const [themeOptions, setThemeOptions] = useState<WpThemeOptions | null>(null);
  const [fallbackLogo, setFallbackLogo] = useState<string>('');
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
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
        const [homeFeedRes, configRes, sectionsRes, logoRes, themeRes] = await Promise.allSettled([
          wooApi.fetchHomeFeed(activeStore),
          wooApi.fetchMobileConfig(activeStore),
          wooApi.fetchWpHomepageSections(activeStore),
          wooApi.fetchStoreLogo(activeStore),
          wooApi.fetchThemeOptions(activeStore),
        ]);

        if (homeFeedRes.status === 'fulfilled') {
          setCategories(homeFeedRes.value.categories || []);
          setFeatured(homeFeedRes.value.featured || []);
          setOnSale(homeFeedRes.value.onSale || []);
          setLatest(homeFeedRes.value.latest || []);
        } else {
          setError(homeFeedRes.reason?.message || 'Unable to load store catalog.');
        }

        if (configRes.status === 'fulfilled' && configRes.value) {
          setMobileConfig(configRes.value);
        }
        if (sectionsRes.status === 'fulfilled' && sectionsRes.value) {
          setWpSections(sectionsRes.value);
        }
        if (logoRes.status === 'fulfilled' && logoRes.value) {
          setFallbackLogo(logoRes.value);
        }
        if (themeRes.status === 'fulfilled' && themeRes.value) {
          setThemeOptions(themeRes.value);
        }
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
  const bannerWidth = Math.max(300, Dimensions.get('window').width - 36);
  const currency = activeStore.currencySymbol;

  // Clean Store & App Name (No "My Boutique")
  const rawName = mobileConfig?.app_name || activeStore.storeName;
  const storeDisplayName =
    !rawName || rawName.trim().toLowerCase() === 'my boutique' ? 'cwgapp' : rawName;

  // Dynamic Logo URL
  const logoUrl =
    mobileConfig?.logo_url ||
    mobileConfig?.app_logo ||
    mobileConfig?.site_logo ||
    fallbackLogo ||
    '';

  // Dynamic Announcement Bar
  const announcementEnabled =
    mobileConfig?.announcement_enabled ?? (themeOptions?.announcement_text ? true : false);
  const announcementText =
    mobileConfig?.announcement_bar ||
    themeOptions?.announcement_text ||
    '🎉 Exclusive Mobile Discount: Use code MOBILE20 for 20% OFF!';

  // Dynamic Stories and Lookbook data
  const storiesList =
    wpSections?.stories && wpSections.stories.length > 0
      ? wpSections.stories
      : wpSections?.carousel_1 && wpSections.carousel_1.length > 0
      ? wpSections.carousel_1
      : categories.slice(0, 8).map((cat) => ({
          label: decodeEntities(cat.name),
          image: cat.image?.src || '',
        }));

  const curatedShowcase =
    wpSections?.featured && wpSections.featured.length > 0
      ? wpSections.featured
      : wpSections?.jewelry_box && wpSections.jewelry_box.length > 0
      ? wpSections.jewelry_box
      : [
          ...(themeOptions?.card_a_title
            ? [
                {
                  label: themeOptions.card_a_title,
                  image: themeOptions.card_a_image || '',
                  price: null,
                  sub: themeOptions.card_a_subtitle || '',
                },
              ]
            : []),
          ...(themeOptions?.card_b_title
            ? [
                {
                  label: themeOptions.card_b_title,
                  image: themeOptions.card_b_image || '',
                  price: null,
                  sub: themeOptions.card_b_subtitle || '',
                },
              ]
            : []),
        ];

  const defaultSections: MobileSectionConfig[] = [
    { uid: 'sec_hero_1', type: 'hero_slider', title: 'Featured Banners Slider', enabled: true },
    { uid: 'sec_stories_1', type: 'stories', title: 'Curated Stories & Circles', enabled: true },
    { uid: 'sec_cat_1', type: 'category_pills', title: 'Shop By Category', enabled: true },
    { uid: 'sec_flash_1', type: 'flash_sale', title: '⚡ Flash Sale - 24 Hours Only', timer: '04h 30m 15s', enabled: true },
    { uid: 'sec_lookbook_1', type: 'lookbook', title: 'Curated Lookbook Showcase', enabled: true },
    { uid: 'sec_banner_1', type: 'banner_grid', title: 'Special VIP Promotional Banner', enabled: true },
    { uid: 'sec_feat_1', type: 'featured', title: 'Featured Highlights', enabled: true },
    { uid: 'sec_prod_1', type: 'product_grid', title: '🔥 Trending Products & Latest Arrivals', limit: 10, enabled: true },
    { uid: 'sec_trust_1', type: 'trust_badges', title: 'Trust & Guarantee', enabled: true },
  ];

  const homeSections = mobileConfig?.pages?.home?.sections;
  const activeSections: MobileSectionConfig[] =
    homeSections && homeSections.length > 0 ? homeSections : defaultSections;

  const trustItems = [
    {
      icon: 'card-outline' as const,
      title: themeOptions?.trust_1_title || 'Flexible Payments',
      sub: themeOptions?.trust_1_subtitle || 'Multiple secure options',
    },
    {
      icon: 'refresh-outline' as const,
      title: themeOptions?.trust_2_title || 'Easy Exchange',
      sub: themeOptions?.trust_2_subtitle || 'Hassle-free process',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: themeOptions?.trust_3_title || 'Verified Authentic',
      sub: themeOptions?.trust_3_subtitle || 'Direct from brands',
    },
  ];

  const mapTrustIcon = (iconName?: string): keyof typeof Ionicons.glyphMap => {
    const icon = (iconName || '').toLowerCase().trim();
    if (icon.includes('card') || icon.includes('pay')) return 'card-outline';
    if (icon.includes('refresh') || icon.includes('return') || icon.includes('exchange')) return 'refresh-outline';
    if (icon.includes('shield') || icon.includes('authentic') || icon.includes('guarantee')) return 'shield-checkmark-outline';
    if (icon.includes('delivery') || icon.includes('truck') || icon.includes('fast') || icon.includes('shipping') || icon.includes('plane')) return 'paper-plane-outline';
    if (icon.includes('lock') || icon.includes('secure')) return 'lock-closed-outline';
    if (icon.includes('medal') || icon.includes('award') || icon.includes('quality') || icon.includes('ribbon')) return 'ribbon-outline';
    if (icon.includes('star') || icon.includes('vip')) return 'star-outline';
    if (icon.includes('support') || icon.includes('call') || icon.includes('headset') || icon.includes('help')) return 'headset-outline';
    return 'shield-checkmark-outline';
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.outlineVariant },
        ]}
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {logoUrl ? (
            /* Show ONLY Brand Logo when logo exists */
            <View style={styles.headerLogoWrap}>
              <Image
                source={{ uri: logoUrl }}
                style={styles.headerLogo}
                resizeMode="contain"
                accessibilityLabel={storeDisplayName}
              />
            </View>
          ) : (
            /* Fallback to Store Name without technical domain */
            <Text numberOfLines={1} style={[styles.storeName, { color: colors.onBackground }]}>
              {storeDisplayName}
            </Text>
          )}
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

      {/* Dynamic Splash Screen / Loading Indicator */}
      {loading && latest.length === 0 ? (
        <View
          style={[
            styles.center,
            { backgroundColor: mobileConfig?.splash_bg_color || colors.background },
          ]}
        >
          {mobileConfig?.splash_screen_image || mobileConfig?.splash_image_url ? (
            <Image
              source={{ uri: mobileConfig.splash_screen_image || mobileConfig.splash_image_url }}
              style={styles.splashImage}
              resizeMode="contain"
            />
          ) : logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          ) : null}
          <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: 20 }} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant, marginTop: 8 }]}>
            Syncing {storeDisplayName}...
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
          {/* Announcement Bar */}
          {announcementEnabled && !announcementDismissed ? (
            <View
              style={[
                styles.announcementBar,
                { backgroundColor: colors.secondaryContainer, borderColor: colors.outlineVariant },
              ]}
            >
              <Ionicons name="sparkles" size={15} color={colors.secondary} />
              <Text
                numberOfLines={1}
                style={[styles.announcementText, { color: colors.onSecondaryContainer }]}
              >
                {announcementText}
              </Text>
              <Pressable
                onPress={() => setAnnouncementDismissed(true)}
                hitSlop={8}
                style={styles.announcementClose}
              >
                <Ionicons name="close" size={15} color={colors.onSecondaryContainer} />
              </Pressable>
            </View>
          ) : null}

          {/* DYNAMIC SECTIONS MAPPED IN EXACT WORDPRESS ORDER WITH SHOW/HIDE SUPPORT */}
          {activeSections.map((sec, secIdx) => {
            // SHOW / HIDE: Skip disabled sections
            if (sec.enabled === false) return null;

            // 1. HERO SLIDER
            if (sec.type === 'hero_slider') {
              const banners =
                sec.banners && sec.banners.length > 0
                  ? sec.banners
                  : themeOptions?.hero_image
                  ? [
                      {
                        id: 'wp_theme_hero',
                        title: themeOptions.hero_heading || 'Exclusive Collection',
                        subtitle: themeOptions.hero_subheading || '',
                        image: themeOptions.hero_image,
                        cta_text: themeOptions.hero_cta_primary_text || 'Shop Now',
                      },
                    ]
                  : [];

              if (banners.length === 0) return null;

              return (
                <View key={sec.uid || `hero_${secIdx}`} style={styles.sliderWrap}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
                      if (idx !== activeBannerIdx && idx >= 0 && idx < banners.length) {
                        setActiveBannerIdx(idx);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {banners.map((banner, index) => (
                      <Pressable
                        key={banner.id || index}
                        onPress={() => navigation.navigate('Explore')}
                        style={[styles.bannerSlide, { width: bannerWidth }]}
                      >
                        <Image source={{ uri: banner.image }} style={styles.bannerImg} resizeMode="cover" />
                        <View style={styles.bannerOverlay}>
                          <Text style={styles.bannerKicker}>FEATURED COLLECTION</Text>
                          <Text numberOfLines={2} style={styles.bannerTitle}>
                            {banner.title}
                          </Text>
                          {banner.subtitle ? (
                            <Text numberOfLines={1} style={styles.bannerSubText}>
                              {banner.subtitle}
                            </Text>
                          ) : null}
                          <View style={styles.bannerCta}>
                            <Text style={styles.bannerCtaText}>{banner.cta_text || 'Shop Now'}</Text>
                            <Ionicons name="arrow-forward" size={14} color="#181615" />
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                  {banners.length > 1 ? (
                    <View style={styles.dotRow}>
                      {banners.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.sliderDot,
                            {
                              backgroundColor: i === activeBannerIdx ? colors.secondary : colors.outlineVariant,
                              width: i === activeBannerIdx ? 16 : 6,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            }

            // 2. STORIES / CURATED CIRCLES
            if (sec.type === 'stories') {
              if (storiesList.length === 0) return null;
              const storiesTitle = sec.title || 'Curated Collections';

              return (
                <View key={sec.uid || `stories_${secIdx}`} style={styles.storiesWrap}>
                  <View style={styles.storiesHeader}>
                    <Text style={[styles.storiesTitle, { color: colors.onSurfaceVariant }]}>
                      {storiesTitle.toUpperCase()}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesRail}
                  >
                    {storiesList.map((story: any, idx: number) => (
                      <Pressable
                        key={idx}
                        onPress={() => navigation.navigate('Explore')}
                        style={styles.storyItem}
                      >
                        <View style={[styles.storyRing, { borderColor: colors.secondary }]}>
                          {story.image ? (
                            <Image source={{ uri: story.image }} style={styles.storyImg} resizeMode="cover" />
                          ) : (
                            <View
                              style={[
                                styles.storyImg,
                                {
                                  backgroundColor: colors.primaryContainer,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                },
                              ]}
                            >
                              <Ionicons name="sparkles" size={18} color={colors.onPrimaryContainer} />
                            </View>
                          )}
                        </View>
                        <Text numberOfLines={1} style={[styles.storyLabel, { color: colors.onSurface }]}>
                          {story.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            }

            // 3. CATEGORY PILLS
            if (sec.type === 'category_pills' || sec.type === 'categories') {
              if (categories.length === 0) return null;
              const catTitle = sec.title || 'Shop By Category';

              return (
                <View key={sec.uid || `cat_${secIdx}`} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                      {catTitle}
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
              );
            }

            // 4. FLASH SALE WITH COUNTDOWN TIMER
            if (sec.type === 'flash_sale' || sec.type === 'special_offers') {
              const saleProducts = onSale.length > 0 ? onSale : latest.slice(0, 4);
              if (saleProducts.length === 0) return null;
              const flashTitle = sec.title || '⚡ Flash Sale - 24 Hours Only';
              const flashSub = sec.subtitle || 'Limited stock deals on trending fashion & accessories';
              const timerStr = sec.timer || '04h 30m 15s';

              return (
                <View
                  key={sec.uid || `flash_${secIdx}`}
                  style={[
                    styles.flashCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.flashHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.flashBadgeRow}>
                        <View style={[styles.flashPill, { backgroundColor: colors.secondary }]}>
                          <Ionicons name="flash" size={12} color="#FFFFFF" />
                          <Text style={styles.flashPillText}>LIMITED DEAL</Text>
                        </View>
                        <View style={[styles.timerBadge, { backgroundColor: colors.surfaceVariant }]}>
                          <Ionicons name="time-outline" size={13} color={colors.secondary} />
                          <Text style={[styles.timerText, { color: colors.secondary, fontWeight: '700' }]}>
                            {timerStr}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.flashTitle, { color: colors.onSurface }]}>
                        {flashTitle}
                      </Text>
                      {flashSub ? (
                        <Text style={[styles.flashSub, { color: colors.onSurfaceVariant }]}>
                          {flashSub}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => navigation.navigate('Explore')}>
                      <Text style={[styles.seeAll, { color: colors.secondary }]}>See all</Text>
                    </Pressable>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.flashRail}
                  >
                    {saleProducts.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        currencySymbol={currency}
                        isWishlisted={wishlistIds.has(item.id)}
                        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
                        onToggleWishlist={() => toggleWishlist(item)}
                        onQuickAdd={() => addToCart(item)}
                        style={{ width: 168 }}
                      />
                    ))}
                  </ScrollView>
                </View>
              );
            }

            // 5. CURATED LOOKBOOK SHOWCASE
            if (sec.type === 'lookbook') {
              if (curatedShowcase.length === 0) return null;
              const lookTitle = sec.title || 'Curated Lookbook Showcase';

              return (
                <View key={sec.uid || `look_${secIdx}`} style={styles.lookbookWrap}>
                  <View style={styles.lookbookHeader}>
                    <Text style={[styles.lookbookTitle, { color: colors.onBackground }]}>
                      {lookTitle}
                    </Text>
                    <Pressable onPress={() => navigation.navigate('Explore')}>
                      <Text style={[styles.seeAll, { color: colors.secondary }]}>Explore</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    {curatedShowcase.map((item: any, idx: number) => (
                      <Pressable
                        key={idx}
                        onPress={() => navigation.navigate('Explore')}
                        style={[
                          styles.showcaseCard,
                          { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
                        ]}
                      >
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.showcaseImg} resizeMode="cover" />
                        ) : (
                          <View
                            style={[styles.showcaseImg, { backgroundColor: colors.surfaceVariant }]}
                          />
                        )}
                        <View style={styles.showcaseMeta}>
                          <Text numberOfLines={1} style={[styles.showcaseLabel, { color: colors.onSurface }]}>
                            {item.label}
                          </Text>
                          {item.price ? (
                            <Text style={[styles.showcasePrice, { color: colors.secondary }]}>
                              {currency}{item.price}
                            </Text>
                          ) : null}
                          {item.sub ? (
                            <Text numberOfLines={1} style={[styles.showcaseSub, { color: colors.onSurfaceVariant }]}>
                              {item.sub}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            }

            // 6. SPECIAL VIP PROMOTIONAL BANNER
            if (sec.type === 'banner_grid') {
              const bannerImg = sec.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800';
              const badge = sec.badge || 'VIP SPECIAL';
              const headline = sec.headline || sec.title || 'Unlock Free Express Shipping';
              const desc = sec.desc || sec.subtitle || 'On all mobile orders over $50.';

              return (
                <Pressable
                  key={sec.uid || `vip_${secIdx}`}
                  onPress={() => navigation.navigate('Explore')}
                  style={[styles.vipBannerWrap, { borderColor: colors.outlineVariant }]}
                >
                  <Image source={{ uri: bannerImg }} style={styles.vipBannerImg} resizeMode="cover" />
                  <View style={styles.vipBannerOverlay}>
                    {badge ? (
                      <View style={[styles.vipBadge, { backgroundColor: colors.tertiary }]}>
                        <Text style={styles.vipBadgeText}>{badge}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.vipHeadline}>{headline}</Text>
                    {desc ? (
                      <Text numberOfLines={2} style={styles.vipDesc}>
                        {desc}
                      </Text>
                    ) : null}
                    <View style={styles.vipCtaBtn}>
                      <Text style={styles.vipCtaText}>Explore Exclusive Deals</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FAF8F5" />
                    </View>
                  </View>
                </Pressable>
              );
            }

            // 7. FEATURED HIGHLIGHTS RAIL
            if (sec.type === 'featured' || sec.type === 'featured_highlights') {
              const featProducts = featured.length > 0 ? featured : latest.slice(0, 4);
              if (featProducts.length === 0) return null;
              const featTitle = sec.title || 'Featured Highlights';

              return (
                <View key={sec.uid || `feat_${secIdx}`} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                      {featTitle}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.railPad}
                  >
                    {featProducts.map((item) => (
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
              );
            }

            // 8. PRODUCT GRID / LATEST ARRIVALS (2-COLUMN GRID)
            if (sec.type === 'product_grid' || sec.type === 'latest_arrivals') {
              if (latest.length === 0) return null;
              const prodTitle = sec.title || 'Latest Arrivals';
              const limit = sec.limit || 10;
              const displayProducts = latest.slice(0, limit);

              return (
                <View key={sec.uid || `prod_${secIdx}`} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                      {prodTitle}
                    </Text>
                    <Pressable onPress={() => navigation.navigate('Explore')}>
                      <Text style={[styles.seeAll, { color: colors.secondary }]}>Browse all</Text>
                    </Pressable>
                  </View>
                  <View style={styles.grid}>
                    {displayProducts.map((item) => (
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
              );
            }

            // 9. TRUST & GUARANTEE BADGES
            if (sec.type === 'trust_badges') {
              const trustHeading = sec.title || `Why Shop With ${storeDisplayName}`;
              const activeTrustItems =
                sec.items && Array.isArray(sec.items) && sec.items.length > 0
                  ? sec.items.slice(0, 4)
                  : trustItems;

              return (
                <View
                  key={sec.uid || `trust_${secIdx}`}
                  style={[
                    styles.trustCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <Text style={[styles.trustHeading, { color: colors.onSurface }]}>
                    {trustHeading}
                  </Text>
                  <View style={styles.trustGrid}>
                    {activeTrustItems.map((item: any, idx: number) => (
                      <View key={idx} style={styles.trustItem}>
                        <Ionicons
                          name={typeof item.icon === 'string' ? mapTrustIcon(item.icon) : (item.icon || 'shield-checkmark-outline')}
                          size={20}
                          color={colors.secondary}
                        />
                        <Text style={[styles.trustTitle, { color: colors.onSurface }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.trustSub, { color: colors.onSurfaceVariant }]}>
                          {item.description || item.sub || item.subtitle || ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            }

            return null;
          })}
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
  headerLogoWrap: {
    height: 38,
    maxWidth: 160,
    justifyContent: 'center',
  },
  headerLogo: {
    width: 140,
    height: 36,
  },
  storeName: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
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
  announcementBar: {
    marginHorizontal: 18,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  announcementText: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },
  announcementClose: {
    padding: 2,
  },
  sliderWrap: {
    marginTop: 14,
    marginHorizontal: 18,
    gap: 10,
  },
  bannerSlide: {
    height: 184,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerWrap: {
    marginHorizontal: 18,
    marginTop: 10,
    height: 180,
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
  bannerSubText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#EBE4DA',
    marginTop: 2,
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
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sliderDot: {
    height: 6,
    borderRadius: 3,
  },
  storiesWrap: {
    marginTop: 2,
  },
  storiesHeader: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storiesTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  storiesRail: {
    paddingHorizontal: 18,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
  },
  storyImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  storyLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    textAlign: 'center',
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
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  catCount: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  flashSaleWrap: {
    gap: 12,
  },
  flashCard: {
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  flashHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  flashBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  flashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flashPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timerText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  flashTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  flashSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  flashRail: {
    gap: 12,
  },
  lookbookWrap: {
    marginHorizontal: 18,
    gap: 12,
  },
  lookbookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  lookbookTitle: {
    fontFamily: Fonts.display,
    fontSize: 19,
  },
  showcaseCard: {
    width: 180,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  showcaseImg: {
    width: '100%',
    height: 120,
  },
  showcaseMeta: {
    padding: 12,
    gap: 2,
  },
  showcaseLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  showcasePrice: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  showcaseSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  vipBannerWrap: {
    marginHorizontal: 18,
    height: 180,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  vipBannerImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  vipBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,22,21,0.55)',
    padding: 20,
    justifyContent: 'flex-end',
    gap: 6,
  },
  vipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vipBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  vipHeadline: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: '#FAF8F5',
  },
  vipDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#EBE4DA',
  },
  vipCtaBtn: {
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
  vipCtaText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#181615',
  },
  grid: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trustCard: {
    marginHorizontal: 18,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  trustHeading: {
    fontFamily: Fonts.display,
    fontSize: 16,
    textAlign: 'center',
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  trustItem: {
    width: '47%',
    gap: 3,
  },
  trustTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  trustSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  splashImage: {
    width: '80%',
    height: '50%',
    maxWidth: 300,
    maxHeight: 380,
  },
  splashLogo: {
    width: 130,
    height: 130,
  },
});
