import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import {
  CatalogSortOption,
  SORT_OPTIONS,
  WooProduct,
  WooProductCategory,
} from '../types/woo';
import { decodeEntities } from '../utils/htmlParser';

type ExploreNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Explore'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const ExploreScreen: React.FC = () => {
  const { activeStore, colors, wishlistIds, toggleWishlist, addToCart } = useApp();
  const navigation = useNavigation<ExploreNavProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Explore'>>();

  const [categories, setCategories] = useState<WooProductCategory[]>([]);
  const [searchInput, setSearchInput] = useState(route.params?.initialSearch || '');
  const [debouncedSearch, setDebouncedSearch] = useState(route.params?.initialSearch || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    route.params?.initialCategoryId ?? null,
  );
  const [sortOption, setSortOption] = useState<CatalogSortOption>('NEWEST');
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [products, setProducts] = useState<WooProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Draft filters for modal
  const [draftSort, setDraftSort] = useState<CatalogSortOption>('NEWEST');
  const [draftOnSale, setDraftOnSale] = useState(false);
  const [draftInStock, setDraftInStock] = useState(false);
  const [draftMinPrice, setDraftMinPrice] = useState('');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (route.params?.initialCategoryId !== undefined) {
      setSelectedCategoryId(route.params.initialCategoryId);
    }
    if (route.params?.initialSearch !== undefined) {
      setSearchInput(route.params.initialSearch);
      setDebouncedSearch(route.params.initialSearch);
    }
  }, [route.params?.initialCategoryId, route.params?.initialSearch]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 380);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!activeStore) return;
    wooApi
      .fetchCategories(activeStore)
      .then(setCategories)
      .catch(() => {});
  }, [activeStore]);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!activeStore) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const items = await wooApi.fetchProducts(activeStore, {
          page: targetPage,
          perPage: 20,
          search: debouncedSearch,
          categoryId: selectedCategoryId,
          sort: sortOption,
          onSale: onSaleOnly,
          inStockOnly,
          minPrice,
          maxPrice,
        });
        setProducts((prev) => (append ? [...prev, ...items] : items));
        setPage(targetPage);
        setHasMore(items.length === 20);
      } catch (err: any) {
        setError(err?.message || 'Unable to load products.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      activeStore,
      debouncedSearch,
      selectedCategoryId,
      sortOption,
      onSaleOnly,
      inStockOnly,
      minPrice,
      maxPrice,
    ],
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  if (!activeStore) return null;

  const cardWidth = (Dimensions.get('window').width - 36 - 12) / 2;
  const activeFilterCount =
    (sortOption !== 'NEWEST' ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0);

  const openFilterModal = () => {
    setDraftSort(sortOption);
    setDraftOnSale(onSaleOnly);
    setDraftInStock(inStockOnly);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    setSortOption(draftSort);
    setOnSaleOnly(draftOnSale);
    setInStockOnly(draftInStock);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setFilterModalOpen(false);
  };

  const resetFilters = () => {
    setDraftSort('NEWEST');
    setDraftOnSale(false);
    setDraftInStock(false);
    setDraftMinPrice('');
    setDraftMaxPrice('');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.outline },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.onSurfaceVariant}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {searchInput.length > 0 ? (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={openFilterModal}
          style={[
            styles.filterBtn,
            {
              backgroundColor:
                activeFilterCount > 0 ? colors.primary : colors.surface,
              borderColor: colors.outline,
            },
          ]}
          accessibilityLabel="Filter and sort products"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? colors.onPrimary : colors.onSurface}
          />
          {activeFilterCount > 0 ? (
            <View style={[styles.filterBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Category Chips */}
      <View style={styles.chipBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipBar}
        >
          <Pressable
            onPress={() => setSelectedCategoryId(null)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedCategoryId === null ? colors.primary : colors.surface,
                borderColor:
                  selectedCategoryId === null ? colors.primary : colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    selectedCategoryId === null ? colors.onPrimary : colors.onSurface,
                },
              ]}
            >
              All
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const active = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategoryId(active ? null : cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.onPrimary : colors.onSurface },
                  ]}
                >
                  {decodeEntities(cat.name)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : error && products.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>{error}</Text>
          <Pressable
            onPress={() => fetchPage(1, false)}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) {
              fetchPage(page + 1, true);
            }
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={40} color={colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                No matching products
              </Text>
              <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                Try adjusting your search or filter selections.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.secondary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              currencySymbol={activeStore.currencySymbol}
              isWishlisted={wishlistIds.has(item.id)}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              onToggleWishlist={() => toggleWishlist(item)}
              onQuickAdd={() => addToCart(item)}
              style={{ width: cardWidth }}
            />
          )}
        />
      )}

      <Modal
        visible={filterModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                Filter & Sort
              </Text>
              <Pressable onPress={resetFilters}>
                <Text style={[styles.resetText, { color: colors.secondary }]}>Reset</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 18 }}>
              <View style={{ gap: 8 }}>
                <Text style={[styles.groupTitle, { color: colors.onSurfaceVariant }]}>
                  SORT BY
                </Text>
                <View style={styles.sortChips}>
                  {SORT_OPTIONS.map((opt) => {
                    const selected = draftSort === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setDraftSort(opt.key)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surfaceVariant,
                            borderColor: selected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: selected ? colors.onPrimary : colors.onSurface,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.onSurface }]}>
                  On Sale Only
                </Text>
                <Switch
                  value={draftOnSale}
                  onValueChange={setDraftOnSale}
                  trackColor={{ true: colors.secondary }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.onSurface }]}>
                  In Stock Only
                </Text>
                <Switch
                  value={draftInStock}
                  onValueChange={setDraftInStock}
                  trackColor={{ true: colors.secondary }}
                />
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[styles.groupTitle, { color: colors.onSurfaceVariant }]}>
                  PRICE RANGE ({decodeEntities(activeStore.currencySymbol)})
                </Text>
                <View style={styles.priceInputRow}>
                  <TextInput
                    value={draftMinPrice}
                    onChangeText={setDraftMinPrice}
                    placeholder="Min"
                    placeholderTextColor={colors.onSurfaceVariant}
                    keyboardType="numeric"
                    style={[
                      styles.priceInput,
                      {
                        color: colors.onSurface,
                        backgroundColor: colors.background,
                        borderColor: colors.outline,
                      },
                    ]}
                  />
                  <Text style={{ color: colors.onSurfaceVariant }}>—</Text>
                  <TextInput
                    value={draftMaxPrice}
                    onChangeText={setDraftMaxPrice}
                    placeholder="Max"
                    placeholderTextColor={colors.onSurfaceVariant}
                    keyboardType="numeric"
                    style={[
                      styles.priceInput,
                      {
                        color: colors.onSurface,
                        backgroundColor: colors.background,
                        borderColor: colors.outline,
                      },
                    ]}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setFilterModalOpen(false)}
                style={[styles.cancelBtn, { borderColor: colors.outline }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.onSurface }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={applyFilters}
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.applyBtnText, { color: colors.onPrimary }]}>
                  Apply Filters
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  chipBarWrap: { height: 48 },
  chipBar: {
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  columnWrap: {
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
  },
  resetText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  groupTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.9,
  },
  sortChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
});
