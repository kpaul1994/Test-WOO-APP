import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import { WooCoupon } from '../types/woo';
import { formatPrice } from '../utils/priceFormatter';

const EMPTY_BAG = require('../../assets/img_empty_bag.jpg');

type CartNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Bag'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const CartScreen: React.FC = () => {
  const {
    activeStore,
    colors,
    cartItems,
    cartSubtotal,
    updateCartQuantity,
    removeCartItem,
    showToast,
  } = useApp();
  const navigation = useNavigation<CartNavProp>();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<WooCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const val = Number(appliedCoupon.amount || 0);
    if (Number.isNaN(val) || val <= 0) return 0;
    if (appliedCoupon.discount_type === 'percent') {
      return Math.min(cartSubtotal, (cartSubtotal * val) / 100);
    }
    return Math.min(cartSubtotal, val);
  }, [appliedCoupon, cartSubtotal]);

  const totalAmount = Math.max(0, cartSubtotal - discountAmount);

  if (!activeStore) return null;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const coupon = await wooApi.validateCoupon(activeStore, couponInput);
      const minSpend = Number(coupon.minimum_amount || 0);
      if (minSpend > 0 && cartSubtotal < minSpend) {
        throw new Error(
          `Minimum order of ${formatPrice(minSpend, activeStore.currencySymbol)} required.`,
        );
      }
      setAppliedCoupon(coupon);
      showToast(`Coupon ${coupon.code.toUpperCase()} applied`);
    } catch (err: any) {
      showToast(err?.message || 'Invalid coupon code.');
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
          Shopping Bag
        </Text>
        <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>
          {cartItems.length} {cartItems.length === 1 ? 'line' : 'lines'}
        </Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Image source={EMPTY_BAG} style={styles.emptyImg} resizeMode="cover" />
          <Text style={[styles.emptyTitle, { color: colors.onBackground }]}>
            Your bag is empty
          </Text>
          <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
            Explore {activeStore.storeName} and add items to begin checkout.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Explore')}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingHorizontal: 24 }]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Start Shopping
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.localId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
                ]}
              >
                <Pressable
                  onPress={() =>
                    navigation.navigate('ProductDetail', { productId: item.productId })
                  }
                  style={[styles.thumbWrap, { backgroundColor: colors.surfaceVariant }]}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={24} color={colors.onSurfaceVariant} />
                  )}
                </Pressable>

                <View style={styles.itemInfo}>
                  <View style={styles.itemTop}>
                    <Text numberOfLines={2} style={[styles.itemName, { color: colors.onSurface }]}>
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => removeCartItem(item.localId)}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${item.name}`}
                    >
                      <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
                    </Pressable>
                  </View>

                  {item.variantSummary ? (
                    <Text numberOfLines={1} style={[styles.variantText, { color: colors.onSurfaceVariant }]}>
                      {item.variantSummary}
                    </Text>
                  ) : null}

                  <View style={styles.itemBottom}>
                    <Text style={[styles.itemPrice, { color: colors.onSurface }]}>
                      {formatPrice(item.price * item.quantity, activeStore.currencySymbol)}
                    </Text>

                    <View style={[styles.stepper, { borderColor: colors.outline }]}>
                      <Pressable
                        onPress={() => updateCartQuantity(item.localId, -1)}
                        style={styles.stepBtn}
                        accessibilityLabel="Decrease quantity"
                      >
                        <Ionicons name="remove" size={16} color={colors.onSurface} />
                      </Pressable>
                      <Text style={[styles.stepVal, { color: colors.onSurface }]}>
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateCartQuantity(item.localId, 1)}
                        style={styles.stepBtn}
                        accessibilityLabel="Increase quantity"
                      >
                        <Ionicons name="add" size={16} color={colors.onSurface} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}
            ListFooterComponent={
              <View
                style={[
                  styles.couponBox,
                  { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
                ]}
              >
                <Text style={[styles.couponTitle, { color: colors.onSurface }]}>
                  Promo Code
                </Text>
                {appliedCoupon ? (
                  <View
                    style={[
                      styles.appliedChip,
                      { backgroundColor: colors.tertiaryContainer },
                    ]}
                  >
                    <Ionicons
                      name="pricetag"
                      size={16}
                      color={colors.onTertiaryContainer}
                    />
                    <Text
                      style={[
                        styles.appliedText,
                        { color: colors.onTertiaryContainer },
                      ]}
                    >
                      {appliedCoupon.code.toUpperCase()} (–
                      {formatPrice(discountAmount, activeStore.currencySymbol)})
                    </Text>
                    <Pressable onPress={() => setAppliedCoupon(null)} hitSlop={8}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.onTertiaryContainer}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.couponRow}>
                    <TextInput
                      value={couponInput}
                      onChangeText={setCouponInput}
                      placeholder="Enter WooCommerce coupon"
                      placeholderTextColor={colors.onSurfaceVariant}
                      autoCapitalize="characters"
                      style={[
                        styles.couponInput,
                        {
                          color: colors.onSurface,
                          backgroundColor: colors.background,
                          borderColor: colors.outline,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={handleApplyCoupon}
                      disabled={couponLoading}
                      style={[styles.applyBtn, { backgroundColor: colors.secondary }]}
                    >
                      {couponLoading ? (
                        <ActivityIndicator color={colors.onSecondary} size="small" />
                      ) : (
                        <Text style={[styles.applyBtnText, { color: colors.onSecondary }]}>
                          Apply
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            }
          />

          <View
            style={[
              styles.summaryBar,
              { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>
                Subtotal
              </Text>
              <Text style={[styles.summaryVal, { color: colors.onSurface }]}>
                {formatPrice(cartSubtotal, activeStore.currencySymbol)}
              </Text>
            </View>
            {discountAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.tertiary }]}>
                  Discount
                </Text>
                <Text style={[styles.summaryVal, { color: colors.tertiary }]}>
                  -{formatPrice(discountAmount, activeStore.currencySymbol)}
                </Text>
              </View>
            ) : null}
            <View style={[styles.summaryRow, { marginTop: 2 }]}>
              <Text style={[styles.totalLabel, { color: colors.onSurface }]}>Total</Text>
              <Text style={[styles.totalVal, { color: colors.onSurface }]}>
                {formatPrice(totalAmount, activeStore.currencySymbol)}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                navigation.navigate('Checkout', {
                  couponCode: appliedCoupon?.code || null,
                  discountAmount,
                })
              }
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                Proceed to Checkout
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        </>
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
  headerSub: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  emptyImg: {
    width: 170,
    height: 170,
    borderRadius: 24,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    marginTop: 6,
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 18,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  thumbWrap: {
    width: 84,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  variantText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontFamily: Fonts.mono,
    fontSize: 15,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
  },
  stepBtn: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    minWidth: 22,
    textAlign: 'center',
  },
  couponBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  couponTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  appliedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  appliedText: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  summaryBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  summaryVal: {
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  totalLabel: {
    fontFamily: Fonts.display,
    fontSize: 17,
  },
  totalVal: {
    fontFamily: Fonts.mono,
    fontSize: 18,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
});
