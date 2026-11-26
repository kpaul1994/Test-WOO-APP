import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import { WooProduct, WooProductReview, WooProductVariation } from '../types/woo';
import { decodeEntities, htmlToPlainText } from '../utils/htmlParser';
import { calcDiscountPercent, formatRawPrice } from '../utils/priceFormatter';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const ProductDetailScreen: React.FC = () => {
  const {
    activeStore,
    activeCustomer,
    colors,
    wishlistIds,
    toggleWishlist,
    addToCart,
    showToast,
  } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const { productId } = route.params;

  const [product, setProduct] = useState<WooProduct | null>(null);
  const [variations, setVariations] = useState<WooProductVariation[]>([]);
  const [reviews, setReviews] = useState<WooProductReview[]>([]);
  const [related, setRelated] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);

  // Review composer modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!activeStore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await wooApi.fetchProductDetail(activeStore, productId);
      setProduct(data.product);
      setVariations(data.variations);
      setReviews(data.reviews);
      setRelated(data.related);

      // Auto-select first option of each variation attribute
      const initialAttrs: Record<string, string> = {};
      data.product.attributes
        .filter((a) => a.variation && a.options.length > 0)
        .forEach((a) => {
          initialAttrs[a.name] = a.options[0];
        });
      setSelectedAttrs(initialAttrs);
    } catch (err: any) {
      setError(err?.message || 'Unable to load product.');
    } finally {
      setLoading(false);
    }
  }, [activeStore, productId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (activeCustomer) {
      setReviewerName(`${activeCustomer.firstName} ${activeCustomer.lastName}`.trim() || activeCustomer.username);
      setReviewerEmail(activeCustomer.email);
    }
  }, [activeCustomer]);

  const variationAttrs = useMemo(
    () => (product ? product.attributes.filter((a) => a.variation && a.options.length > 0) : []),
    [product],
  );

  const matchedVariation = useMemo(() => {
    if (!product || product.type !== 'variable' || variations.length === 0) return null;
    return (
      variations.find((v) =>
        v.attributes.every((va) => {
          const chosen = selectedAttrs[va.name];
          return !chosen || chosen.toLowerCase() === va.option.toLowerCase();
        }),
      ) || null
    );
  }, [product, variations, selectedAttrs]);

  if (!activeStore) return null;

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.onBackground }]}>
          {error || 'Product not found'}
        </Text>
        <Pressable
          onPress={loadDetail}
          style={[styles.primaryBtn, { backgroundColor: colors.primary, paddingHorizontal: 22 }]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const galleryImages = (() => {
    const imgs = [...(product.images || [])];
    if (matchedVariation?.image?.src) {
      const exists = imgs.some((i) => i.src === matchedVariation.image?.src);
      if (!exists) imgs.unshift(matchedVariation.image);
    }
    return imgs;
  })();

  const activePrice = matchedVariation?.price || product.price || product.regular_price;
  const activeRegular = matchedVariation?.regular_price || product.regular_price;
  const isOnSale = matchedVariation ? matchedVariation.on_sale : product.on_sale;
  const discount = calcDiscountPercent(activeRegular, matchedVariation?.sale_price || product.sale_price);
  const stockStatus = matchedVariation?.stock_status || product.stock_status;
  const inStock = stockStatus !== 'outofstock';
  const purchasable = matchedVariation ? matchedVariation.purchasable : product.purchasable;
  const canAdd =
    inStock &&
    purchasable &&
    (product.type !== 'variable' || variationAttrs.length === 0 || matchedVariation !== null);

  const descriptionText = htmlToPlainText(product.description || product.short_description);
  const skuText = matchedVariation?.sku || product.sku;

  const handleReviewSubmit = async () => {
    if (!reviewerName.trim() || !reviewerEmail.trim() || !reviewText.trim()) {
      showToast('Please enter your name, email, and review.');
      return;
    }
    setSubmittingReview(true);
    try {
      const created = await wooApi.submitProductReview(activeStore, {
        productId: product.id,
        reviewerName,
        reviewerEmail,
        reviewText,
        rating,
      });
      setReviews((prev) => [created, ...prev]);
      setReviewModalOpen(false);
      setReviewText('');
      showToast('Review submitted');
    } catch (err: any) {
      showToast(err?.message || 'Unable to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        <View style={[styles.carouselWrap, { backgroundColor: colors.surfaceVariant }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveSlide(idx);
            }}
          >
            {galleryImages.length > 0 ? (
              galleryImages.map((img, idx) => (
                <Image
                  key={`${img.id}-${idx}`}
                  source={{ uri: img.src }}
                  style={{ width: SCREEN_WIDTH, height: 390 }}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View style={{ width: SCREEN_WIDTH, height: 390, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={56} color={colors.onSurfaceVariant} />
              </View>
            )}
          </ScrollView>

          <SafeAreaView style={styles.overlayBar} edges={['top']}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.overlayBtn, { backgroundColor: `${colors.surface}EA` }]}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color={colors.onSurface} />
            </Pressable>
            <Pressable
              onPress={() => toggleWishlist(product)}
              style={[styles.overlayBtn, { backgroundColor: `${colors.surface}EA` }]}
              accessibilityLabel="Toggle saved"
            >
              <Ionicons
                name={wishlistIds.has(product.id) ? 'heart' : 'heart-outline'}
                size={20}
                color={wishlistIds.has(product.id) ? colors.secondary : colors.onSurface}
              />
            </Pressable>
          </SafeAreaView>

          {galleryImages.length > 1 ? (
            <View style={styles.dotsRow}>
              {galleryImages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === activeSlide ? colors.primary : 'rgba(255,255,255,0.6)',
                      width: i === activeSlide ? 18 : 7,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.detailsBody}>
          {/* Metadata pills */}
          <View style={styles.metaRow}>
            {product.categories[0] ? (
              <View style={[styles.metaChip, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.metaChipText, { color: colors.onPrimaryContainer }]}>
                  {decodeEntities(product.categories[0].name).toUpperCase()}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: inStock
                    ? colors.tertiaryContainer
                    : colors.errorContainer,
                },
              ]}
            >
              <Text
                style={[
                  styles.metaChipText,
                  {
                    color: inStock
                      ? colors.onTertiaryContainer
                      : colors.onErrorContainer,
                  },
                ]}
              >
                {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
              </Text>
            </View>
            {discount ? (
              <View style={[styles.metaChip, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.metaChipText, { color: colors.onSecondaryContainer }]}>
                  SAVE {discount}%
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.onBackground }]}>
            {decodeEntities(product.name)}
          </Text>

          <View style={styles.priceRatingRow}>
            <View style={styles.priceGroup}>
              <Text style={[styles.price, { color: colors.onBackground }]}>
                {formatRawPrice(activePrice, activeStore.currencySymbol)}
              </Text>
              {isOnSale && activeRegular ? (
                <Text style={[styles.strikePrice, { color: colors.onSurfaceVariant }]}>
                  {formatRawPrice(activeRegular, activeStore.currencySymbol)}
                </Text>
              ) : null}
            </View>

            <View style={styles.ratingBox}>
              <Ionicons name="star" size={16} color={colors.goldRating} />
              <Text style={[styles.ratingValue, { color: colors.onSurface }]}>
                {Number(product.average_rating || 0).toFixed(1)}
              </Text>
              <Text style={[styles.reviewCount, { color: colors.onSurfaceVariant }]}>
                ({product.rating_count} reviews)
              </Text>
            </View>
          </View>

          {skuText ? (
            <Text style={[styles.skuText, { color: colors.onSurfaceVariant }]}>
              SKU: {skuText}
            </Text>
          ) : null}

          {/* Variable Product Attribute Selectors */}
          {variationAttrs.length > 0 ? (
            <View style={styles.variationsWrap}>
              {variationAttrs.map((attr) => (
                <View key={attr.name} style={{ gap: 8 }}>
                  <Text style={[styles.attrTitle, { color: colors.onSurface }]}>
                    {decodeEntities(attr.name)}:{' '}
                    <Text style={{ color: colors.secondary }}>
                      {selectedAttrs[attr.name] || 'Select'}
                    </Text>
                  </Text>
                  <View style={styles.attrOptions}>
                    {attr.options.map((opt) => {
                      const active = selectedAttrs[attr.name] === opt;
                      return (
                        <Pressable
                          key={opt}
                          onPress={() =>
                            setSelectedAttrs((prev) => ({ ...prev, [attr.name]: opt }))
                          }
                          style={[
                            styles.attrChip,
                            {
                              backgroundColor: active ? colors.primary : colors.surface,
                              borderColor: active ? colors.primary : colors.outline,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.attrChipText,
                              { color: active ? colors.onPrimary : colors.onSurface },
                            ]}
                          >
                            {decodeEntities(opt)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Description */}
          {descriptionText ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                Product Details
              </Text>
              <Text style={[styles.descText, { color: colors.onSurfaceVariant }]}>
                {descriptionText}
              </Text>
            </View>
          ) : null}

          {/* Customer Reviews */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                Customer Reviews ({reviews.length})
              </Text>
              <Pressable onPress={() => setReviewModalOpen(true)}>
                <Text style={[styles.writeReviewLink, { color: colors.secondary }]}>
                  Write a Review
                </Text>
              </Pressable>
            </View>

            {reviews.length === 0 ? (
              <Text style={[styles.emptyReview, { color: colors.onSurfaceVariant }]}>
                No reviews yet. Be the first to share your thoughts.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {reviews.map((rev) => (
                  <View
                    key={rev.id}
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.reviewHeader}>
                      <Text style={[styles.reviewerName, { color: colors.onSurface }]}>
                        {decodeEntities(rev.reviewer)}
                      </Text>
                      <View style={styles.starsRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < rev.rating ? 'star' : 'star-outline'}
                            size={13}
                            color={colors.goldRating}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={[styles.reviewBody, { color: colors.onSurfaceVariant }]}>
                      {htmlToPlainText(rev.review)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Related Products */}
          {related.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                You May Also Like
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingTop: 6 }}
              >
                {related.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    currencySymbol={activeStore.currencySymbol}
                    isWishlisted={wishlistIds.has(item.id)}
                    onPress={() =>
                      navigation.push('ProductDetail', { productId: item.id })
                    }
                    onToggleWishlist={() => toggleWishlist(item)}
                    onQuickAdd={() => addToCart(item)}
                    style={{ width: 170 }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Add to Bag Bar */}
      <View
        style={[
          styles.stickyBar,
          { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant },
        ]}
      >
        <View style={[styles.stepper, { borderColor: colors.outline }]}>
          <Pressable
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            style={styles.stepperBtn}
            accessibilityLabel="Decrease quantity"
          >
            <Ionicons name="remove" size={18} color={colors.onSurface} />
          </Pressable>
          <Text style={[styles.stepperVal, { color: colors.onSurface }]}>{quantity}</Text>
          <Pressable
            onPress={() => setQuantity((q) => q + 1)}
            style={styles.stepperBtn}
            accessibilityLabel="Increase quantity"
          >
            <Ionicons name="add" size={18} color={colors.onSurface} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => addToCart(product, matchedVariation, quantity)}
          disabled={!canAdd}
          style={[
            styles.addBtn,
            {
              backgroundColor: canAdd ? colors.primary : colors.surfaceVariant,
            },
          ]}
        >
          <Ionicons
            name="bag-add-outline"
            size={18}
            color={canAdd ? colors.onPrimary : colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.addBtnText,
              { color: canAdd ? colors.onPrimary : colors.onSurfaceVariant },
            ]}
          >
            {inStock ? 'Add to Bag' : 'Out of Stock'}
          </Text>
        </Pressable>
      </View>

      {/* Write a Review Modal */}
      <Modal
        visible={reviewModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Write a Review
            </Text>

            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={28}
                    color={colors.goldRating}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              value={reviewerName}
              onChangeText={setReviewerName}
              placeholder="Your Name"
              placeholderTextColor={colors.onSurfaceVariant}
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.background,
                  borderColor: colors.outline,
                },
              ]}
            />
            <TextInput
              value={reviewerEmail}
              onChangeText={setReviewerEmail}
              placeholder="Your Email"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.background,
                  borderColor: colors.outline,
                },
              ]}
            />
            <TextInput
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Share your experience with this product..."
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              numberOfLines={4}
              style={[
                styles.textArea,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.background,
                  borderColor: colors.outline,
                },
              ]}
            />

            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setReviewModalOpen(false)}
                style={[styles.cancelBtn, { borderColor: colors.outline }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.onSurface }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleReviewSubmit}
                disabled={submittingReview}
                style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.primary }]}
              >
                {submittingReview ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                    Submit Review
                  </Text>
                )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  scrollContent: { paddingBottom: 24 },
  carouselWrap: { position: 'relative', height: 390 },
  overlayBar: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  overlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  detailsBody: {
    padding: 18,
    gap: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaChipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.7,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    lineHeight: 30,
  },
  priceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontFamily: Fonts.mono,
    fontSize: 22,
  },
  strikePrice: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  reviewCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  skuText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  variationsWrap: {
    gap: 14,
    paddingTop: 4,
  },
  attrTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  attrOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attrChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  attrChipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  sectionBlock: {
    gap: 8,
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  writeReviewLink: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  descText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyReview: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  stepper: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    minWidth: 24,
    textAlign: 'center',
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
  },
  starPicker: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  textArea: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
});
