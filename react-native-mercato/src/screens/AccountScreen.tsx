import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ENV } from '../config/env';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';
import * as wooApi from '../services/wooApi';
import { Fonts } from '../theme/theme';
import { ThemeMode, WooOrderResponse } from '../types/woo';
import { formatPrice } from '../utils/priceFormatter';

export const AccountScreen: React.FC = () => {
  const {
    activeStore,
    savedStores,
    activeCustomer,
    colors,
    themeMode,
    setThemeMode,
    hideDemoControls,
    setHideDemoControls,
    showDemoStoreControls,
    recentOrderIds,
    loginCustomer,
    registerCustomer,
    updateCustomerProfile,
    logoutCustomer,
    switchStore,
    disconnectStore,
    recordOrderId,
    showToast,
  } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Auth form
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [wpHelpOpen, setWpHelpOpen] = useState(false);

  // Edit profile modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editAddr, setEditAddr] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editCountry, setEditCountry] = useState('US');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Orders & order tracking
  const [orders, setOrders] = useState<WooOrderResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trackOrderInput, setTrackOrderInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WooOrderResponse | null>(null);

  const loadOrders = useCallback(async () => {
    if (!activeStore) return;
    setOrdersLoading(true);
    try {
      const list = await wooApi.fetchOrders(activeStore, {
        customerId: activeCustomer?.customerId,
        recentOrderIds,
      });
      setOrders(list);
    } catch {
      // Non-fatal
    } finally {
      setOrdersLoading(false);
    }
  }, [activeStore, activeCustomer?.customerId, recentOrderIds]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (!activeStore) return null;

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginCustomer(loginIdentifier, loginPassword);
      setLoginPassword('');
    } catch (err: any) {
      setAuthError(err?.message || 'Sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await registerCustomer({
        firstName: regFirst,
        lastName: regLast,
        email: regEmail,
        username: regUsername,
        password: regPassword,
      });
      setRegPassword('');
    } catch (err: any) {
      setAuthError(err?.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const openEditProfile = () => {
    if (!activeCustomer) return;
    setEditFirst(activeCustomer.firstName);
    setEditLast(activeCustomer.lastName);
    setEditAddr(activeCustomer.billing.address1);
    setEditCity(activeCustomer.billing.city);
    setEditState(activeCustomer.billing.state);
    setEditZip(activeCustomer.billing.postcode);
    setEditCountry(activeCustomer.billing.country || 'US');
    setEditPhone(activeCustomer.billing.phone);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateCustomerProfile({
        firstName: editFirst,
        lastName: editLast,
        billing: {
          firstName: editFirst,
          lastName: editLast,
          address1: editAddr,
          city: editCity,
          state: editState,
          postcode: editZip,
          country: editCountry,
          phone: editPhone,
        },
      });
      setEditModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTrackOrder = async () => {
    const id = Number(trackOrderInput.trim());
    if (!id || Number.isNaN(id)) {
      showToast('Enter a valid numeric order ID.');
      return;
    }
    try {
      const order = await wooApi.lookupOrderById(activeStore, id);
      await recordOrderId(order.id);
      setSelectedOrder(order);
      setTrackOrderInput('');
    } catch (err: any) {
      showToast(err?.message || 'Order not found.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
          Account & Orders
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* WordPress & WooCommerce Customer Auth / Profile */}
        {activeCustomer ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>
                  {(activeCustomer.firstName || activeCustomer.username || 'C')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: colors.onSurface }]}>
                  {`${activeCustomer.firstName} ${activeCustomer.lastName}`.trim() ||
                    activeCustomer.username}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.onSurfaceVariant }]}>
                  {activeCustomer.email}
                </Text>
              </View>
              <Pressable
                onPress={openEditProfile}
                style={[styles.smallOutlineBtn, { borderColor: colors.outline }]}
              >
                <Text style={[styles.smallOutlineText, { color: colors.onSurface }]}>
                  Edit
                </Text>
              </Pressable>
            </View>

            {activeCustomer.billing.address1 ? (
              <View style={[styles.addrBox, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
                <Text style={[styles.addrText, { color: colors.onSurfaceVariant }]}>
                  {activeCustomer.billing.address1}, {activeCustomer.billing.city}{' '}
                  {activeCustomer.billing.postcode} ({activeCustomer.billing.country})
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={logoutCustomer}
              style={[styles.logoutBtn, { borderColor: colors.error }]}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                WordPress Customer Account
              </Text>
              <Pressable onPress={() => setWpHelpOpen(true)}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={colors.secondary}
                />
              </Pressable>
            </View>

            <View style={[styles.segmentBar, { backgroundColor: colors.surfaceVariant }]}>
              <Pressable
                onPress={() => {
                  setAuthTab('LOGIN');
                  setAuthError(null);
                }}
                style={[
                  styles.segmentBtn,
                  authTab === 'LOGIN' && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        authTab === 'LOGIN' ? colors.onSurface : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAuthTab('REGISTER');
                  setAuthError(null);
                }}
                style={[
                  styles.segmentBtn,
                  authTab === 'REGISTER' && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        authTab === 'REGISTER' ? colors.onSurface : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  Create Account
                </Text>
              </Pressable>
            </View>

            {authTab === 'LOGIN' ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={loginIdentifier}
                  onChangeText={setLoginIdentifier}
                  placeholder="WordPress Username or Email"
                  placeholderTextColor={colors.onSurfaceVariant}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                />
                <TextInput
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.onSurfaceVariant}
                  secureTextEntry
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                />
                {authError ? (
                  <Text style={[styles.errorMsg, { color: colors.error }]}>{authError}</Text>
                ) : null}
                <Pressable
                  onPress={handleLogin}
                  disabled={authLoading}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  {authLoading ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                      Sign In with WordPress
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={styles.row2}>
                  <TextInput
                    value={regFirst}
                    onChangeText={setRegFirst}
                    placeholder="First Name"
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                  />
                  <TextInput
                    value={regLast}
                    onChangeText={setRegLast}
                    placeholder="Last Name"
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                  />
                </View>
                <TextInput
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholder="Email Address *"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                />
                <TextInput
                  value={regUsername}
                  onChangeText={setRegUsername}
                  placeholder="Username *"
                  placeholderTextColor={colors.onSurfaceVariant}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                />
                <TextInput
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="Password (min 6 chars) *"
                  placeholderTextColor={colors.onSurfaceVariant}
                  secureTextEntry
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
                />
                {authError ? (
                  <Text style={[styles.errorMsg, { color: colors.error }]}>{authError}</Text>
                ) : null}
                <Pressable
                  onPress={handleRegister}
                  disabled={authLoading}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  {authLoading ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                      Register WooCommerce Account
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Orders & Order Lookup */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              My Orders
            </Text>
            <Pressable onPress={loadOrders} hitSlop={8}>
              <Ionicons name="refresh" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.row2}>
            <TextInput
              value={trackOrderInput}
              onChangeText={setTrackOrderInput}
              placeholder="Track by Order ID (e.g. 1042)"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  flex: 1,
                  color: colors.onSurface,
                  borderColor: colors.outline,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <Pressable
              onPress={handleTrackOrder}
              style={[styles.trackBtn, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.trackBtnText, { color: colors.onSecondary }]}>Track</Text>
            </Pressable>
          </View>

          {ordersLoading ? (
            <ActivityIndicator color={colors.secondary} />
          ) : orders.length === 0 ? (
            <Text style={[styles.mutedText, { color: colors.onSurfaceVariant }]}>
              No orders synced yet for {activeStore.storeName}.
            </Text>
          ) : (
            orders.map((ord) => (
              <Pressable
                key={ord.id}
                onPress={() => setSelectedOrder(ord)}
                style={[
                  styles.orderRow,
                  { backgroundColor: colors.background, borderColor: colors.outlineVariant },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderNum, { color: colors.onSurface }]}>
                    Order #{ord.number}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.onSurfaceVariant }]}>
                    {ord.date_created?.slice(0, 10)} • {ord.line_items.length} item(s)
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.orderTotal, { color: colors.onSurface }]}>
                    {formatPrice(Number(ord.total || 0), activeStore.currencySymbol)}
                  </Text>
                  <Text style={[styles.orderStatus, { color: colors.tertiary }]}>
                    {ord.status.toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Appearance Theme */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Appearance
          </Text>
          <View style={styles.themeChips}>
            {(['SYSTEM', 'LIGHT', 'DARK'] as ThemeMode[]).map((mode) => {
              const selected = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: selected ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Demo-only WooCommerce Store API Controls (automatically hidden in production) */}
        {showDemoStoreControls ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.secondary },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                WooCommerce API & Store Setup
              </Text>
              <View style={[styles.demoBadge, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.demoBadgeText, { color: colors.onSecondaryContainer }]}>
                  DEMO ONLY
                </Text>
              </View>
            </View>
            <Text style={[styles.mutedText, { color: colors.onSurfaceVariant }]}>
              Active Store: {activeStore.storeName} ({activeStore.currencyCode})
            </Text>

            {savedStores.length > 1 ? (
              <View style={{ gap: 6 }}>
                <Text style={[styles.smallLabel, { color: colors.onSurfaceVariant }]}>
                  Quick Switch Store
                </Text>
                {savedStores.map((s) => (
                  <Pressable
                    key={s.storeUrl}
                    onPress={() => switchStore(s.storeUrl)}
                    style={[
                      styles.switchRow,
                      {
                        borderColor:
                          s.storeUrl === activeStore.storeUrl
                            ? colors.secondary
                            : colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text style={[styles.switchName, { color: colors.onSurface }]}>
                      {s.storeName}
                    </Text>
                    {s.storeUrl === activeStore.storeUrl ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={() => navigation.navigate('ConnectStore', { allowCancel: true })}
              style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="key-outline" size={18} color={colors.onSecondary} />
              <Text style={[styles.primaryBtnText, { color: colors.onSecondary }]}>
                Connect / Manage Store Keys
              </Text>
            </Pressable>

            <Pressable
              onPress={disconnectStore}
              style={[styles.logoutBtn, { borderColor: colors.outline }]}
            >
              <Text style={[styles.smallOutlineText, { color: colors.onSurface }]}>
                Disconnect Active Store
              </Text>
            </Pressable>

            <View style={styles.switchToggleRow}>
              <Text style={[styles.mutedText, { color: colors.onSurfaceVariant, flex: 1 }]}>
                Hide Demo Setup (Preview Production UI)
              </Text>
              <Switch
                value={hideDemoControls}
                onValueChange={setHideDemoControls}
                trackColor={{ true: colors.secondary }}
              />
            </View>
          </View>
        ) : ENV.SHOW_STORE_SETUP ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            ]}
          >
            <View style={styles.switchToggleRow}>
              <Text style={[styles.mutedText, { color: colors.onSurfaceVariant, flex: 1 }]}>
                Production UI Preview Active (Store Setup Hidden)
              </Text>
              <Pressable onPress={() => setHideDemoControls(false)}>
                <Text style={[styles.reEnableText, { color: colors.secondary }]}>Show</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* WordPress Login Setup Help Modal */}
      <Modal visible={wpHelpOpen} transparent animationType="fade" onRequestClose={() => setWpHelpOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              WordPress Login Compatibility
            </Text>
            <Text style={[styles.modalBody, { color: colors.onSurfaceVariant }]}>
              • Supports "JWT Authentication for WP REST API" (/wp-json/jwt-auth/v1/token).{'\n\n'}
              • Also works out-of-the-box with WordPress Application Passwords via /wp-json/wp/v2/users/me.{'\n\n'}
              • New accounts created via "Create Account" register directly in WooCommerce (/wp-json/wc/v3/customers) using Read/Write keys.
            </Text>
            <Pressable
              onPress={() => setWpHelpOpen(false)}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Profile & Address Modal */}
      <Modal visible={editModalOpen} transparent animationType="slide" onRequestClose={() => setEditModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Edit Profile & Shipping
            </Text>
            <View style={styles.row2}>
              <TextInput
                value={editFirst}
                onChangeText={setEditFirst}
                placeholder="First Name"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
              <TextInput
                value={editLast}
                onChangeText={setEditLast}
                placeholder="Last Name"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
            </View>
            <TextInput
              value={editAddr}
              onChangeText={setEditAddr}
              placeholder="Street Address"
              placeholderTextColor={colors.onSurfaceVariant}
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
            />
            <View style={styles.row2}>
              <TextInput
                value={editCity}
                onChangeText={setEditCity}
                placeholder="City"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
              <TextInput
                value={editState}
                onChangeText={setEditState}
                placeholder="State"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
            </View>
            <View style={styles.row2}>
              <TextInput
                value={editZip}
                onChangeText={setEditZip}
                placeholder="Postal Code"
                placeholderTextColor={colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
              <TextInput
                value={editCountry}
                onChangeText={setEditCountry}
                placeholder="Country"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="characters"
                maxLength={2}
                style={[styles.input, { flex: 1, color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
              />
            </View>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Phone"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.onSurface, borderColor: colors.outline, backgroundColor: colors.background }]}
            />

            <View style={styles.row2}>
              <Pressable
                onPress={() => setEditModalOpen(false)}
                style={[styles.smallOutlineBtn, { flex: 1, height: 46, borderColor: colors.outline }]}
              >
                <Text style={[styles.smallOutlineText, { color: colors.onSurface }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                disabled={savingProfile}
                style={[styles.primaryBtn, { flex: 1, height: 46, backgroundColor: colors.primary }]}
              >
                {savingProfile ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Detail Modal */}
      <Modal visible={selectedOrder !== null} transparent animationType="fade" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalBackdrop}>
          {selectedOrder ? (
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                Order #{selectedOrder.number}
              </Text>
              <Text style={[styles.mutedText, { color: colors.tertiary }]}>
                Status: {selectedOrder.status.toUpperCase()} • {selectedOrder.payment_method_title}
              </Text>
              <View style={{ gap: 6 }}>
                {selectedOrder.line_items.map((li) => (
                  <View key={li.id} style={styles.lineItemRow}>
                    <Text style={[styles.lineItemName, { color: colors.onSurface }]}>
                      {li.quantity}× {li.name}
                    </Text>
                    <Text style={[styles.lineItemPrice, { color: colors.onSurface }]}>
                      {formatPrice(Number(li.total || 0), activeStore.currencySymbol)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.lineItemRow}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Total</Text>
                <Text style={[styles.orderTotal, { color: colors.onSurface }]}>
                  {formatPrice(Number(selectedOrder.total || 0), activeStore.currencySymbol)}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedOrder(null)}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 36,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
  },
  profileName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },
  profileEmail: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  smallOutlineBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallOutlineText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  addrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  addrText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  logoutBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  segmentBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
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
  errorMsg: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  trackBtn: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  mutedText: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderNum: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  orderDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  orderTotal: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  orderStatus: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },
  themeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },
  demoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  demoBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },
  smallLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  switchToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reEnableText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
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
    fontSize: 19,
  },
  modalBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineItemName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  lineItemPrice: {
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
});
