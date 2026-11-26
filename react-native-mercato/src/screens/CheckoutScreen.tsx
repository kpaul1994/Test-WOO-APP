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
import { SearchableSelectModal, SelectOption } from '../components/SearchableSelectModal';
import {
  COUNTRIES,
  getCitySuggestions,
  getCountryName,
  getStateName,
  getStatesForCountry,
  normalizeStateCode,
} from '../utils/locationData';

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
  const initialCountry = activeCustomer?.billing.country || 'IN';
  const [country, setCountry] = useState(initialCountry);
  const [stateCode, setStateCode] = useState(
    normalizeStateCode(initialCountry, activeCustomer?.billing.state || 'WB')
  );
  const [city, setCity] = useState(activeCustomer?.billing.city || 'Kolkata');
  const [postcode, setPostcode] = useState(activeCustomer?.billing.postcode || '');
  const [customerNote, setCustomerNote] = useState('');

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  const handleSelectCountry = (selected: SelectOption) => {
    setCountry(selected.code);
    const available = getStatesForCountry(selected.code);
    if (available.length > 0) {
      setStateCode(available[0].code);
    } else {
      setStateCode('');
    }
  };

  const handleSelectState = (selected: SelectOption) => {
    setStateCode(selected.code);
  };

  const availableStates = getStatesForCountry(country);
  const citySuggestions = getCitySuggestions(country, stateCode);

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

            {/* First & Last Name */}
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  First Name *
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
              </View>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  Last Name *
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Email & Phone */}
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  Email Address *
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@email.com"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
              </View>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  Phone Number
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Street Address */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                Street Address *
              </Text>
              <TextInput
                value={address1}
                onChangeText={setAddress1}
                placeholder="House, street, apartment, area"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[
                  styles.input,
                  {
                    color: colors.onSurface,
                    borderColor: colors.outline,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>

            {/* Country & State Selectors */}
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  Country *
                </Text>
                <Pressable
                  onPress={() => setCountryModalVisible(true)}
                  style={[
                    styles.pickerBtn,
                    {
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Select country"
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.pickerValue, { color: colors.onSurface }]}
                  >
                    {getCountryName(country)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  State / Region *
                </Text>
                {availableStates.length > 0 ? (
                  <Pressable
                    onPress={() => setStateModalVisible(true)}
                    style={[
                      styles.pickerBtn,
                      {
                        borderColor: colors.outline,
                        backgroundColor: colors.background,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Select state"
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.pickerValue, { color: colors.onSurface }]}
                    >
                      {getStateName(country, stateCode) || 'Select state'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.onSurfaceVariant} />
                  </Pressable>
                ) : (
                  <TextInput
                    value={stateCode}
                    onChangeText={setStateCode}
                    placeholder="State / Region"
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={[
                      styles.input,
                      {
                        color: colors.onSurface,
                        borderColor: colors.outline,
                        backgroundColor: colors.background,
                      },
                    ]}
                  />
                )}
              </View>
            </View>

            {/* City & Postal Code */}
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  City *
                </Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Kolkata"
                  placeholderTextColor={colors.onSurfaceVariant}
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
              </View>
              <View style={styles.col2}>
                <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                  Postal Code *
                </Text>
                <TextInput
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="e.g. 700001"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderColor: colors.outline,
                      backgroundColor: colors.background,
                    },
                  ]}
                />
              </View>
            </View>

            {/* City suggestions auto-fill chips */}
            {citySuggestions.length > 0 ? (
              <View style={styles.suggestionsWrap}>
                <Text style={[styles.suggestionHeader, { color: colors.onSurfaceVariant }]}>
                  Suggested cities:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cityChips}
                >
                  {citySuggestions.map((item) => {
                    const isSelected = city.trim().toLowerCase() === item.toLowerCase();
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setCity(item)}
                        style={[
                          styles.cityChip,
                          {
                            backgroundColor: isSelected
                              ? colors.secondaryContainer
                              : colors.background,
                            borderColor: isSelected ? colors.secondary : colors.outlineVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cityChipText,
                            {
                              color: isSelected
                                ? colors.onSecondaryContainer
                                : colors.onSurface,
                              fontFamily: isSelected ? Fonts.bodySemiBold : Fonts.body,
                            },
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Delivery instructions */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
                Delivery Instructions (Optional)
              </Text>
              <TextInput
                value={customerNote}
                onChangeText={setCustomerNote}
                placeholder="Gate code, landmark, delivery notes..."
                placeholderTextColor={colors.onSurfaceVariant}
                style={[
                  styles.input,
                  {
                    color: colors.onSurface,
                    borderColor: colors.outline,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>
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

      <SearchableSelectModal
        visible={countryModalVisible}
        title="Select Country"
        options={COUNTRIES}
        selectedCode={country}
        onSelect={handleSelectCountry}
        onClose={() => setCountryModalVisible(false)}
      />

      <SearchableSelectModal
        visible={stateModalVisible}
        title={`Select State (${getCountryName(country)})`}
        options={availableStates}
        selectedCode={stateCode}
        onSelect={handleSelectState}
        onClose={() => setStateModalVisible(false)}
      />
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
    gap: 12,
    width: '100%',
  },
  col2: {
    flex: 1,
    minWidth: 0,
    width: '50%',
  },
  fieldGroup: {
    width: '100%',
    gap: 4,
  },
  fieldLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    height: 48,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  pickerBtn: {
    height: 48,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontFamily: Fonts.body,
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  suggestionsWrap: {
    marginTop: 2,
    gap: 6,
    width: '100%',
  },
  suggestionHeader: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  cityChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 12,
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
