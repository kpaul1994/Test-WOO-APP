import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import * as storage from '../services/storage';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import { CustomerAddress, WooOrderResponse, WooPaymentGateway } from '../types/woo';
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

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addressChooserOpen, setAddressChooserOpen] = useState(false);

  // New Address Form State
  const [newLabel, setNewLabel] = useState('Home');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [country, setCountry] = useState('IN');
  const [stateCode, setStateCode] = useState('WB');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Modals for country and state
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);

  // Load addresses on mount / customer change
  useEffect(() => {
    if (!activeStore) return;
    (async () => {
      const stored = await storage.loadCustomerAddresses(
        activeStore.storeUrl,
        activeCustomer?.customerId,
      );
      let list = [...stored];

      // If no stored addresses yet, but activeCustomer has a profile address, seed it:
      if (list.length === 0 && activeCustomer) {
        const custFirst = activeCustomer.billing?.firstName || activeCustomer.firstName || '';
        const custLast = activeCustomer.billing?.lastName || activeCustomer.lastName || '';
        const custPhone = activeCustomer.billing?.phone || '';
        const custAddr = activeCustomer.billing?.address1 || '';
        const custCity = activeCustomer.billing?.city || 'Kolkata';
        const custState = activeCustomer.billing?.state || 'WB';
        const custZip = activeCustomer.billing?.postcode || '';
        const custCountry = activeCustomer.billing?.country || 'IN';

        if (custFirst || custAddr || custCity) {
          const initialAddr: CustomerAddress = {
            id: 'addr_profile_default',
            label: 'Default Address',
            firstName: custFirst || 'Customer',
            lastName: custLast,
            phone: custPhone,
            address1: custAddr,
            city: custCity,
            state: normalizeStateCode(custCountry, custState),
            postcode: custZip,
            country: custCountry,
            isDefault: true,
          };
          list = [initialAddr];
          await storage.saveCustomerAddresses(
            activeStore.storeUrl,
            list,
            activeCustomer.customerId,
          );
        }
      }

      setSavedAddresses(list);
      if (list.length > 0) {
        setSelectedAddressId(list[0].id || 'addr_profile_default');
        setIsAddingNew(false);
      } else {
        // Pre-fill form for brand new entry
        setFirstName(activeCustomer?.billing?.firstName || activeCustomer?.firstName || '');
        setLastName(activeCustomer?.billing?.lastName || activeCustomer?.lastName || '');
        setEmail(activeCustomer?.email || '');
        setPhone(activeCustomer?.billing?.phone || '');
        setIsAddingNew(true);
      }
    })();
  }, [activeStore, activeCustomer]);

  // Handle country/state selection
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

  // Selected address object
  const selectedAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0] || null;

  // Gateways & Ordering
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

  // Save new address handler
  const handleSaveNewAddress = async () => {
    if (!firstName.trim() || !lastName.trim() || !address1.trim() || !city.trim()) {
      setError('Please fill in required fields (First Name, Last Name, Street Address, City).');
      return;
    }
    const newAddr: CustomerAddress = {
      id: `addr_${Date.now()}`,
      label: newLabel.trim() || 'Home',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || activeCustomer?.billing?.phone || '',
      address1: address1.trim(),
      city: city.trim(),
      state: stateCode,
      postcode: postcode.trim(),
      country: country,
      isDefault: savedAddresses.length === 0,
    };
    const updatedList = [newAddr, ...savedAddresses];
    setSavedAddresses(updatedList);
    setSelectedAddressId(newAddr.id!);
    setIsAddingNew(false);
    setAddressChooserOpen(false);
    setError(null);
    if (activeStore) {
      await storage.saveCustomerAddresses(
        activeStore.storeUrl,
        updatedList,
        activeCustomer?.customerId,
      );
    }
    showToast('Delivery address saved & selected.');
  };

  const handleSubmitOrder = async () => {
    setError(null);

    // Determine which address to use
    let activeAddr: CustomerAddress | null = null;
    if (isAddingNew) {
      if (!firstName.trim() || !lastName.trim() || !address1.trim() || !city.trim()) {
        setError('Please complete all required shipping fields.');
        return;
      }
      activeAddr = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address1: address1.trim(),
        city: city.trim(),
        state: stateCode,
        postcode: postcode.trim(),
        country: country,
        phone: phone.trim() || activeCustomer?.billing?.phone || '',
      };
    } else if (selectedAddress) {
      activeAddr = selectedAddress;
    } else {
      setError('Please add a delivery address to proceed.');
      return;
    }

    if (!selectedGateway) {
      setError('Select a payment method.');
      return;
    }

    const orderEmail = email.trim() || activeCustomer?.email || 'customer@example.com';

    setSubmitting(true);
    try {
      const order = await placeOrder({
        email: orderEmail,
        billing: {
          firstName: activeAddr.firstName,
          lastName: activeAddr.lastName,
          address1: activeAddr.address1,
          city: activeAddr.city,
          state: activeAddr.state,
          postcode: activeAddr.postcode,
          country: activeAddr.country,
          phone: activeAddr.phone,
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

  // Order Confirmed View
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
      {/* Top Navigation Bar */}
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
                ? `Signed in as ${activeCustomer.email}`
                : 'Checking out as guest. Sign in on the Account tab to sync orders automatically.'}
            </Text>
          </View>

          {/* ============================================================ */}
          {/* 1. SAVED ADDRESS VIEW: Shown when customer already has address */}
          {/* ============================================================ */}
          {savedAddresses.length > 0 && !isAddingNew && selectedAddress ? (
            <View
              style={[
                styles.addressCard,
                { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              ]}
            >
              {/* Card Header with Change Button */}
              <View style={styles.addressCardHeader}>
                <View style={styles.addressCardHeaderLeft}>
                  <View style={[styles.addressPinIcon, { backgroundColor: colors.primaryContainer }]}>
                    <Ionicons name="location" size={16} color={colors.onPrimaryContainer} />
                  </View>
                  <View>
                    <Text style={[styles.addressSectionKicker, { color: colors.secondary }]}>
                      DELIVERY ADDRESS
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.labelBadge, { backgroundColor: colors.surfaceVariant }]}>
                        <Text style={[styles.labelBadgeText, { color: colors.onSurfaceVariant }]}>
                          {selectedAddress.label || 'Home'}
                        </Text>
                      </View>
                      {selectedAddress.isDefault ? (
                        <View style={[styles.labelBadge, { backgroundColor: colors.tertiaryContainer }]}>
                          <Text style={[styles.labelBadgeText, { color: colors.onTertiaryContainer }]}>
                            DEFAULT
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Choose / Change Address Button */}
                <Pressable
                  onPress={() => setAddressChooserOpen(true)}
                  style={[styles.changeAddressBtn, { backgroundColor: colors.surfaceVariant }]}
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.secondary} />
                  <Text style={[styles.changeAddressText, { color: colors.secondary }]}>
                    Choose / Change
                  </Text>
                </Pressable>
              </View>

              {/* Selected Address Details */}
              <View style={styles.addressCardBody}>
                <Text style={[styles.recipientName, { color: colors.onSurface }]}>
                  {selectedAddress.firstName} {selectedAddress.lastName}
                </Text>
                <Text style={[styles.addressLine, { color: colors.onSurfaceVariant }]}>
                  {selectedAddress.address1}
                </Text>
                <Text style={[styles.addressLine, { color: colors.onSurfaceVariant }]}>
                  {selectedAddress.city}
                  {selectedAddress.state ? `, ${getStateName(selectedAddress.country, selectedAddress.state) || selectedAddress.state}` : ''}
                  {selectedAddress.postcode ? ` - ${selectedAddress.postcode}` : ''}
                </Text>
                <Text style={[styles.addressLine, { color: colors.onSurfaceVariant }]}>
                  {getCountryName(selectedAddress.country)}
                </Text>
                {selectedAddress.phone ? (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={14} color={colors.secondary} />
                    <Text style={[styles.phoneText, { color: colors.onSurface }]}>
                      {selectedAddress.phone}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Footer with "+ Add New Address" Button */}
              <View style={[styles.addressCardFooter, { borderTopColor: colors.outlineVariant }]}>
                <Pressable
                  onPress={() => {
                    setFirstName(activeCustomer?.billing?.firstName || activeCustomer?.firstName || '');
                    setLastName(activeCustomer?.billing?.lastName || activeCustomer?.lastName || '');
                    setPhone(activeCustomer?.billing?.phone || '');
                    setAddress1('');
                    setCity('');
                    setPostcode('');
                    setNewLabel('Home');
                    setIsAddingNew(true);
                  }}
                  style={[styles.addNewAddrBtn, { borderColor: colors.outlineVariant }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.secondary} />
                  <Text style={[styles.addNewAddrText, { color: colors.secondary }]}>
                    + Add New Address
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* ============================================================ */}
          {/* 2. NEW ADDRESS FORM: Shown ONLY if isAddingNew is true       */}
          {/* ============================================================ */}
          {isAddingNew ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              ]}
            >
              <View style={styles.formHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                    Add Delivery Address
                  </Text>
                  <Text style={[styles.fieldSub, { color: colors.onSurfaceVariant }]}>
                    Enter your recipient shipping and contact details
                  </Text>
                </View>
                {savedAddresses.length > 0 ? (
                  <Pressable
                    onPress={() => setIsAddingNew(false)}
                    style={[styles.backToSavedBtn, { backgroundColor: colors.surfaceVariant }]}
                  >
                    <Ionicons name="arrow-back" size={14} color={colors.secondary} />
                    <Text style={[styles.backToSavedText, { color: colors.secondary }]}>
                      Use Saved
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Address Label Pills */}
              <View style={styles.labelPillsRow}>
                {(['Home', 'Office', 'Other'] as const).map((lbl) => {
                  const selected = newLabel === lbl;
                  return (
                    <Pressable
                      key={lbl}
                      onPress={() => setNewLabel(lbl)}
                      style={[
                        styles.labelPill,
                        {
                          backgroundColor: selected ? colors.secondary : colors.surfaceVariant,
                          borderColor: selected ? colors.secondary : colors.outlineVariant,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.labelPillText,
                          { color: selected ? '#FFFFFF' : colors.onSurfaceVariant },
                        ]}
                      >
                        {lbl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

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
                    Phone Number *
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

              {/* Save Address Button */}
              <Pressable
                onPress={handleSaveNewAddress}
                style={[styles.saveAddrBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveAddrBtnText}>Save & Deliver to this Address</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Delivery instructions */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.fieldGroup}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
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
                    marginTop: 6,
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

          {/* Place Order CTA */}
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

      {/* ============================================================ */}
      {/* 3. CHOOSE ADDRESS MODAL: Pick from multiple saved addresses */}
      {/* ============================================================ */}
      <Modal
        visible={addressChooserOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressChooserOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                Select Delivery Address
              </Text>
              <Pressable onPress={() => setAddressChooserOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 12, paddingVertical: 8 }}>
              {savedAddresses.map((addr) => {
                const isSelected = (addr.id || 'default') === selectedAddressId;
                return (
                  <Pressable
                    key={addr.id || Math.random().toString()}
                    onPress={() => {
                      setSelectedAddressId(addr.id || 'default');
                      setAddressChooserOpen(false);
                      setIsAddingNew(false);
                    }}
                    style={[
                      styles.addressOptionCard,
                      {
                        backgroundColor: isSelected ? colors.secondaryContainer : colors.background,
                        borderColor: isSelected ? colors.secondary : colors.outlineVariant,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? colors.secondary : colors.onSurfaceVariant}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.addressOptionName, { color: colors.onSurface }]}>
                          {addr.firstName} {addr.lastName}
                        </Text>
                        <View style={[styles.labelBadge, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[styles.labelBadgeText, { color: colors.onSurfaceVariant }]}>
                            {addr.label || 'Home'}
                          </Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={[styles.addressOptionSub, { color: colors.onSurfaceVariant }]}>
                        {addr.address1}
                      </Text>
                      <Text style={[styles.addressOptionSub, { color: colors.onSurfaceVariant }]}>
                        {addr.city}, {getStateName(addr.country, addr.state) || addr.state} - {addr.postcode}
                      </Text>
                      {addr.phone ? (
                        <Text style={[styles.addressOptionPhone, { color: colors.secondary }]}>
                          📞 {addr.phone}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => {
                setAddressChooserOpen(false);
                setFirstName(activeCustomer?.billing?.firstName || activeCustomer?.firstName || '');
                setLastName(activeCustomer?.billing?.lastName || activeCustomer?.lastName || '');
                setPhone(activeCustomer?.billing?.phone || '');
                setAddress1('');
                setCity('');
                setPostcode('');
                setNewLabel('Home');
                setIsAddingNew(true);
              }}
              style={[styles.modalAddNewBtn, { borderColor: colors.secondary }]}
            >
              <Ionicons name="add" size={18} color={colors.secondary} />
              <Text style={[styles.modalAddNewText, { color: colors.secondary }]}>
                + Add New Delivery Address
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Country & State Select Modals */}
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
  // Address Card Styling
  addressCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressPinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSectionKicker: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  labelBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  changeAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeAddressText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },
  addressCardBody: {
    gap: 4,
    paddingVertical: 4,
  },
  recipientName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  addressLine: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  phoneText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  addressCardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  addNewAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addNewAddrText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },

  // Form Card Styling
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
  },
  fieldSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  backToSavedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  backToSavedText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },
  labelPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  labelPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelPillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  saveAddrBtn: {
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  saveAddrBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
  },
  addressOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  addressOptionName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  addressOptionSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  addressOptionPhone: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    marginTop: 2,
  },
  modalAddNewBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  modalAddNewText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
});
