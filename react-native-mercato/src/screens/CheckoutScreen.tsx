import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import { WooOrderResponse, WooPaymentGateway } from '../types/woo';
import { htmlToPlainText } from '../utils/htmlParser';
import { formatPrice } from '../utils/priceFormatter';

export const CheckoutScreen: React.FC = () => {
  const {
    activeStore,
    activeCustomer,
    colors,
    cartItems,
    cartSubtotal,
    placeOrder,
    showToast,
  } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const couponCode = route.params?.couponCode || null;
  const discountAmount = route.params?.discountAmount || 0;

  const [firstName, setFirstName] = useState(activeCustomer?.billing.firstName || activeCustomer?.firstName || '');
  const [lastName, setLastName] = useState(activeCustomer?.billing.lastName || activeCustomer?.lastName || '');
  const [email, setEmail] = useState(activeCustomer?.email || '');
  const [phone, setPhone] = useState(activeCustomer?.billing.phone || '');
  const [address1, setAddress1] = useState(activeCustomer?.billing.address1 || '');
  const [city, setCity] = useState(activeCustomer?.billing.city || '');
  const [stateCode, setStateCode] = useState(activeCustomer?.billing.state || '');
  const [postcode, setPostcode] = useState(activeCustomer?.billing.postcode || '');
  const [country, setCountry] = useState(activeCustomer?.billing.country || 'US');
  const [customerNote, setCustomerNote] = useState('');

  const [gateways, setGateways] = useState<WooPaymentGateway[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('cod');
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<WooOrderResponse | null>(null);

  useEffect(() => {
    if (!activeStore) return;
    setLoadingGateways(true);
    wooApi
      .fetchEnabledPaymentGateways(activeStore)
      .then((list) => {
        setGateways(list);
        if (list.length > 0) setSelectedGatewayId(list[0].id);
      })
      .catch(() => {
        setGateways([
          {
            id: 'cod',
            title: 'Cash on Delivery',
            description: 'Pay with cash upon delivery.',
            order: 0,
            enabled: true,
          },
        ]);
      })
      .finally(() => setLoadingGateways(false));
  }, [activeStore]);

  if (!activeStore) return null;

  const finalTotal = Math.max(0, cartSubtotal - discountAmount);
  const selectedGateway = gateways.find((g) => g.id === selectedGatewayId) || gateways[0];

  const handleOpenPaymentUrl = async (url?: string | null) => {
    if (!url || !url.toLowerCase().startsWith('https://')) {
      showToast('Secure HTTPS payment link unavailable for this order.');
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const handleSubmitOrder = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !address1.trim() || !city.trim()) {
      setError('Please complete all required shipping fields.');
      return;
    }
    if (!selectedGateway) {
      setError('Select a payment method.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        email,
        billing: {
          firstName,
          lastName,
          address1,
          city,
          state: stateCode,
          postcode,
          country,
          phone,
        },
        paymentMethodId: selectedGateway.id,
        paymentMethodTitle: htmlToPlainText(selectedGateway.title),
        couponCode,
        customerNote,
      });
      setPlacedOrder(order);
    } catch (err: any) {
      setError(err?.message || 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    const hasHttpsPayment =
      !!placedOrder.payment_url && placedOrder.payment_url.toLowerCase().startsWith('https://');
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.confirmWrap}>
          <View style={[styles.successIcon, { backgroundColor: colors.tertiaryContainer }]}>
            <Ionicons name="checkmark" size={40} color={colors.onTertiaryContainer} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.onBackground }]}>
            Order Confirmed
          </Text>
          <Text style={[styles.confirmSub, { color: colors.onSurfaceVariant }]}>
            Order #{placedOrder.number} has been registered in {activeStore.storeName}.
          </Text>

          <View
            style={[
              styles.confirmCard,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.confirmRow}>
              <Text style={[styles.confirmLabel, { color: colors.onSurfaceVariant }]}>Status</Text>
              <Text style={[styles.confirmValue, { color: colors.tertiary }]}>
                {placedOrder.status.toUpperCase()}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={[styles.confirmLabel, { color: colors.onSurfaceVariant }]}>Payment</Text>
              <Text style={[styles.confirmValue, { color: colors.onSurface }]}>
                {placedOrder.payment_method_title}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={[styles.confirmLabel, { color: colors.onSurfaceVariant }]}>Total</Text>
              <Text style={[styles.confirmValueMono, { color: colors.onSurface }]}>
                {formatPrice(Number(placedOrder.total || 0), activeStore.currencySymbol)}
              </Text>
            </View>
          </View>

          {hasHttpsPayment ? (
            <Pressable
              onPress={() => handleOpenPaymentUrl(placedOrder.payment_url)}
              style={[styles.primaryBtn, { backgroundColor: colors.secondary, width: '100%' }]}
            >
              <Ionicons name="card-outline" size={18} color={colors.onSecondary} />
              <Text style={[styles.primaryBtnText, { color: colors.onSecondary }]}>
                Complete Online Payment
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, width: '100%' }]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Continue Shopping
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.outlineVariant }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.onBackground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.onBackground }]}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Customer Identity Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons
              name={activeCustomer ? 'person-circle-outline' : 'person-add-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.infoBannerText, { color: colors.onSurfaceVariant }]}>
              {activeCustomer
                ? `Signed in as ${activeCustomer.email} — saved shipping address pre-filled.`
                : 'Checking out as guest. Sign in on the Account tab to sync orders automatically.'}
            </Text>
          </View>

          {/* Shipping & Billing Form */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Shipping & Billing Details
            </Text>

            <View style={styles.row2}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name *"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name *"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address *"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
            />

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
            />

            <TextInput
              value={address1}
              onChangeText={setAddress1}
              placeholder="Street Address *"
              placeholderTextColor={colors.onSurfaceVariant}
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
            />

            <View style={styles.row2}>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City *"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
              <TextInput
                value={stateCode}
                onChangeText={setStateCode}
                placeholder="State"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.row2}>
              <TextInput
                value={postcode}
                onChangeText={setPostcode}
                placeholder="Postal Code"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
              <TextInput
                value={country}
                onChangeText={setCountry}
                placeholder="Country (US)"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="characters"
                maxLength={2}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
            </View>

            <TextInput
              value={customerNote}
              onChangeText={setCustomerNote}
              placeholder="Delivery instructions (optional)"
              placeholderTextColor={colors.onSurfaceVariant}
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
            />
          </View>

          {/* Payment Gateways */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Payment Method
            </Text>
            {loadingGateways ? (
              <ActivityIndicator color={colors.secondary} />
            ) : (
              gateways.map((gw) => {
                const selected = gw.id === selectedGatewayId;
                return (
                  <Pressable
                    key={gw.id}
                    onPress={() => setSelectedGatewayId(gw.id)}
                    style={[
                      styles.gatewayRow,
                      {
                        borderColor: selected ? colors.secondary : colors.outlineVariant,
                        backgroundColor: selected ? colors.secondaryContainer : colors.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? colors.secondary : colors.onSurfaceVariant}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gatewayTitle, { color: colors.onSurface }]}>
                        {htmlToPlainText(gw.title)}
                      </Text>
                      {gw.description ? (
                        <Text
                          numberOfLines={2}
                          style={[styles.gatewayDesc, { color: colors.onSurfaceVariant }]}
                        >
                          {htmlToPlainText(gw.description)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Order Summary */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Order Summary ({cartItems.length} items)
            </Text>
            <View style={styles.confirmRow}>
              <Text style={[styles.confirmLabel, { color: colors.onSurfaceVariant }]}>Subtotal</Text>
              <Text style={[styles.confirmValueMono, { color: colors.onSurface }]}>
                {formatPrice(cartSubtotal, activeStore.currencySymbol)}
              </Text>
            </View>
            {discountAmount > 0 ? (
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: colors.tertiary }]}>
                  Coupon ({couponCode?.toUpperCase()})
                </Text>
                <Text style={[styles.confirmValueMono, { color: colors.tertiary }]}>
                  -{formatPrice(discountAmount, activeStore.currencySymbol)}
                </Text>
              </View>
            ) : null}
            <View style={styles.confirmRow}>
              <Text style={[styles.totalText, { color: colors.onSurface }]}>Total Due</Text>
              <Text style={[styles.totalTextMono, { color: colors.onSurface }]}>
                {formatPrice(finalTotal, activeStore.currencySymbol)}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
              <Ionicons name="alert-circle" size={18} color={colors.onErrorContainer} />
              <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmitOrder}
            disabled={submitting || cartItems.length === 0}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: submitting ? 0.75 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={18} color={colors.onPrimary} />
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                  Place Order • {formatPrice(finalTotal, activeStore.currencySymbol)}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 19,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 36,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  gatewayTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  gatewayDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  confirmValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  confirmValueMono: {
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  totalText: {
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  totalTextMono: {
    fontFamily: Fonts.mono,
    fontSize: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
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
  confirmWrap: {
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  confirmTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 26,
  },
  confirmSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginVertical: 8,
  },
});
