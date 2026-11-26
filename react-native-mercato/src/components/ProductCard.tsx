import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Fonts } from '../theme/theme';
import { WooProduct } from '../types/woo';
import { decodeEntities } from '../utils/htmlParser';
import { calcDiscountPercent, formatRawPrice } from '../utils/priceFormatter';

interface ProductCardProps {
  product: WooProduct;
  currencySymbol: string;
  isWishlisted: boolean;
  onPress: () => void;
  onToggleWishlist: () => void;
  onQuickAdd?: () => void;
  style?: ViewStyle;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currencySymbol,
  isWishlisted,
  onPress,
  onToggleWishlist,
  onQuickAdd,
  style,
}) => {
  const { colors } = useApp();
  const discount = calcDiscountPercent(product.regular_price, product.sale_price);
  const inStock = product.stock_status !== 'outofstock';
  const canQuickAdd = product.type === 'simple' && inStock && product.purchasable && !!onQuickAdd;
  const imageUri = product.images[0]?.src;
  const categoryName = decodeEntities(product.categories[0]?.name || 'Collection');
  const displayPrice = formatRawPrice(product.price || product.regular_price, currencySymbol);
  const strikePrice =
    product.on_sale && product.regular_price
      ? formatRawPrice(product.regular_price, currencySymbol)
      : '';
  const rating = Number(product.average_rating || 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          opacity: pressed ? 0.94 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={decodeEntities(product.name)}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.surfaceVariant }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={28} color={colors.onSurfaceVariant} />
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.badgeCol}>
            {!inStock ? (
              <View style={[styles.badge, { backgroundColor: colors.errorContainer }]}>
                <Text style={[styles.badgeText, { color: colors.onErrorContainer }]}>
                  SOLD OUT
                </Text>
              </View>
            ) : discount ? (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.onSecondary }]}>
                  -{discount}%
                </Text>
              </View>
            ) : product.featured ? (
              <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.badgeText, { color: colors.onPrimaryContainer }]}>
                  FEATURED
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleWishlist();
            }}
            hitSlop={8}
            style={[styles.iconPill, { backgroundColor: `${colors.surface}E8` }]}
            accessibilityLabel={isWishlisted ? 'Remove from saved' : 'Save product'}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={18}
              color={isWishlisted ? colors.secondary : colors.onSurface}
            />
          </Pressable>
        </View>

        {canQuickAdd ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onQuickAdd?.();
            }}
            hitSlop={6}
            style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Quick add to bag"
          >
            <Ionicons name="add" size={18} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.category, { color: colors.onSurfaceVariant }]}
        >
          {categoryName.toUpperCase()}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.title, { color: colors.onSurface }]}
        >
          {decodeEntities(product.name)}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.onSurface }]}>
              {displayPrice || `${currencySymbol}0.00`}
            </Text>
            {strikePrice ? (
              <Text style={[styles.strikePrice, { color: colors.onSurfaceVariant }]}>
                {strikePrice}
              </Text>
            ) : null}
          </View>

          {rating > 0 ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.goldRating} />
              <Text style={[styles.ratingText, { color: colors.onSurfaceVariant }]}>
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    aspectRatio: 0.92,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeCol: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  body: {
    padding: 12,
    gap: 4,
  },
  category: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 19,
    minHeight: 38,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexShrink: 1,
  },
  price: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  strikePrice: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
});
