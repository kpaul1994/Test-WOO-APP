import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Fonts } from '../theme/theme';
import { formatPrice } from '../utils/priceFormatter';

type WishlistNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Saved'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const WishlistScreen: React.FC = () => {
  const {
    activeStore,
    colors,
    wishlistItems,
    removeWishlistItem,
    addToCart,
  } = useApp();
  const navigation = useNavigation<WishlistNavProp>();

  if (!activeStore) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
          Saved Items
        </Text>
        <Text style={[styles.headerCount, { color: colors.onSurfaceVariant }]}>
          {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="heart-outline" size={34} color={colors.onPrimaryContainer} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onBackground }]}>
            Nothing saved yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
            Tap the heart icon on any product to keep favorites handy for later.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Explore')}
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.exploreBtnText, { color: colors.onPrimary }]}>
              Discover Products
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item) => String(item.productId)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('ProductDetail', { productId: item.productId })
              }
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              ]}
            >
              <View style={[styles.thumbWrap, { backgroundColor: colors.surfaceVariant }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <Ionicons name="image-outline" size={24} color={colors.onSurfaceVariant} />
                )}
              </View>

              <View style={styles.infoCol}>
                <Text numberOfLines={1} style={[styles.category, { color: colors.onSurfaceVariant }]}>
                  {item.categoryName.toUpperCase()}
                </Text>
                <Text numberOfLines={2} style={[styles.name, { color: colors.onSurface }]}>
                  {item.name}
                </Text>
                <Text style={[styles.price, { color: colors.onSurface }]}>
                  {formatPrice(item.price, activeStore.currencySymbol)}
                </Text>

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => {
                      addToCart({
                        id: item.productId,
                        name: item.name,
                        slug: '',
                        permalink: '',
                        type: 'simple',
                        status: 'publish',
                        featured: false,
                        description: '',
                        short_description: '',
                        sku: '',
                        price: String(item.price),
                        regular_price: item.regularPrice ? String(item.regularPrice) : String(item.price),
                        sale_price: '',
                        on_sale: item.onSale,
                        purchasable: true,
                        stock_status: 'instock',
                        average_rating: item.averageRating,
                        rating_count: 0,
                        categories: [{ id: 0, name: item.categoryName, slug: '' }],
                        images: item.imageUrl
                          ? [{ id: 0, src: item.imageUrl, name: '', alt: '' }]
                          : [],
                        attributes: [],
                        variations: [],
                        related_ids: [],
                      });
                    }}
                    style={[styles.moveBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="bag-add-outline" size={15} color={colors.onPrimary} />
                    <Text style={[styles.moveBtnText, { color: colors.onPrimary }]}>
                      Add to Bag
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => removeWishlistItem(item.productId)}
                    style={[styles.removeBtn, { borderColor: colors.outline }]}
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
  },
  headerCount: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  exploreBtn: {
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  exploreBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  listContent: {
    padding: 18,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  thumbWrap: {
    width: 96,
    height: 112,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 4,
  },
  category: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  price: {
    fontFamily: Fonts.mono,
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  moveBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  moveBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  removeBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
