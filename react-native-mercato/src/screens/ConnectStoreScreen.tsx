import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';
import { Fonts } from '../theme/theme';

const CONNECT_HERO = require('../../assets/img_connect_hero.jpg');

export const ConnectStoreScreen: React.FC = () => {
  const {
    colors,
    savedStores,
    activeStore,
    connectStore,
    switchStore,
    removeSavedStore,
  } = useApp();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ConnectStore'>>();
  const allowCancel = route.params?.allowCancel ?? false;

  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [customName, setCustomName] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);

  const hasConnectedStore = savedStores.length > 0;

  const handleEnterStore = async (url: string) => {
    try {
      if (activeStore?.storeUrl !== url) {
        await switchStore(url);
      }
    } catch {
      // ignore
    }
    navigation.navigate('MainTabs');
  };

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      await connectStore({
        rawUrl: storeUrl,
        consumerKey,
        consumerSecret,
        customStoreName: customName,
      });
      setShowManualSetup(false);
      navigation.navigate('MainTabs');
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to store.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Banner */}
          <View style={styles.heroWrap}>
            <Image source={CONNECT_HERO} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroOverlay}>
              {allowCancel ? (
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={[styles.backBtn, { backgroundColor: 'rgba(24,22,21,0.68)' }]}
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="arrow-back" size={20} color="#FAF8F5" />
                </Pressable>
              ) : null}

              <View style={styles.heroTextWrap}>
                <View
                  style={[
                    styles.pillBadge,
                    {
                      backgroundColor:
                        hasConnectedStore && !showManualSetup
                          ? 'rgba(46, 125, 50, 0.92)'
                          : 'rgba(196,93,62,0.9)',
                    },
                  ]}
                >
                  <Ionicons
                    name={hasConnectedStore && !showManualSetup ? 'checkmark-circle' : 'storefront-outline'}
                    size={14}
                    color="#FAF8F5"
                  />
                  <Text style={styles.pillBadgeText}>
                    {hasConnectedStore && !showManualSetup
                      ? 'CONNECTED STORE READY'
                      : 'WOOCOMMERCE READY'}
                  </Text>
                </View>
                <Text style={styles.heroTitle}>
                  {hasConnectedStore && !showManualSetup
                    ? activeStore?.storeName || savedStores[0]?.storeName || 'NextEcom'
                    : 'cwgapp'}
                </Text>
                <Text style={styles.heroSub}>
                  {hasConnectedStore && !showManualSetup
                    ? 'Connected to WooCommerce. Tap below to launch and explore your live native store.'
                    : 'Connect any WooCommerce store URL & REST keys to launch a live native storefront.'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            {/* 1. If Store(s) Connected and NOT in manual setup mode: Show Connected Store Card & Enter Storefront button */}
            {hasConnectedStore && !showManualSetup ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                  Connected Store
                </Text>

                <View style={{ gap: 14 }}>
                  {savedStores.map((store) => {
                    const isCurrent = activeStore?.storeUrl === store.storeUrl;
                    const storeDisplayName =
                      !store.storeName || store.storeName.trim().toLowerCase() === 'my boutique'
                        ? 'NextEcom Store'
                        : store.storeName;

                    return (
                      <Pressable
                        key={store.storeUrl}
                        onPress={() => handleEnterStore(store.storeUrl)}
                        style={[
                          styles.connectedCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isCurrent ? colors.secondary : colors.outlineVariant,
                          },
                        ]}
                      >
                        <View style={styles.connectedCardTop}>
                          <View
                            style={[
                              styles.storeAvatar,
                              { backgroundColor: colors.primaryContainer },
                            ]}
                          >
                            <Ionicons
                              name="bag-handle"
                              size={22}
                              color={colors.onPrimaryContainer}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={[styles.savedName, { color: colors.onSurface }]}
                            >
                              {storeDisplayName}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.savedUrl, { color: colors.onSurfaceVariant }]}
                            >
                              {store.storeUrl}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.activeChip,
                              { backgroundColor: colors.tertiaryContainer },
                            ]}
                          >
                            <Text
                              style={[
                                styles.activeChipText,
                                { color: colors.onTertiaryContainer },
                              ]}
                            >
                              CONNECTED
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => removeSavedStore(store.storeUrl)}
                            hitSlop={10}
                            style={{ padding: 6 }}
                            accessibilityLabel={`Remove ${store.storeName}`}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color={colors.onSurfaceVariant}
                            />
                          </Pressable>
                        </View>

                        {/* Direct Click to Enter Store */}
                        <Pressable
                          onPress={() => handleEnterStore(store.storeUrl)}
                          style={[
                            styles.enterStoreBtn,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={[styles.enterStoreBtnText, { color: colors.onPrimary }]}>
                            Enter Storefront
                          </Text>
                          <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Option to reveal setup form only if explicitly requested */}
                <Pressable
                  onPress={() => setShowManualSetup(true)}
                  style={[
                    styles.connectAnotherBtn,
                    { borderColor: colors.outlineVariant, backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.secondary} />
                  <Text style={[styles.connectAnotherText, { color: colors.secondary }]}>
                    Connect Another WooCommerce Store
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* 2. Setup Form: Shown ONLY when no store is connected, OR when user explicitly clicks "Connect Another Store" */}
            {!hasConnectedStore || showManualSetup ? (
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
                ]}
              >
                {/* Back to Connected Store button if canceling manual setup */}
                {hasConnectedStore && showManualSetup ? (
                  <Pressable
                    onPress={() => setShowManualSetup(false)}
                    style={styles.backToConnectedBtn}
                  >
                    <Ionicons name="arrow-back" size={16} color={colors.secondary} />
                    <Text style={[styles.backToConnectedText, { color: colors.secondary }]}>
                      Back to Connected Store
                    </Text>
                  </Pressable>
                ) : null}

                <View style={styles.formHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                    Connect New Store
                  </Text>
                  <Pressable onPress={() => setGuideOpen(true)} style={styles.guideBtn}>
                    <Ionicons
                      name="help-circle-outline"
                      size={18}
                      color={colors.secondary}
                    />
                    <Text style={[styles.guideBtnText, { color: colors.secondary }]}>
                      Setup Guide
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                    Store URL (HTTPS)
                  </Text>
                  <TextInput
                    value={storeUrl}
                    onChangeText={setStoreUrl}
                    placeholder="https://yourstore.com"
                    placeholderTextColor={colors.onSurfaceVariant}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={[
                      styles.input,
                      {
                        color: colors.onSurface,
                        backgroundColor: colors.background,
                        borderColor: colors.outline,
                      },
                    ]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                    Consumer Key
                  </Text>
                  <TextInput
                    value={consumerKey}
                    onChangeText={setConsumerKey}
                    placeholder="ck_xxxxxxxxxxxxxxxx"
                    placeholderTextColor={colors.onSurfaceVariant}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      {
                        color: colors.onSurface,
                        backgroundColor: colors.background,
                        borderColor: colors.outline,
                      },
                    ]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                    Consumer Secret
                  </Text>
                  <View style={styles.secretRow}>
                    <TextInput
                      value={consumerSecret}
                      onChangeText={setConsumerSecret}
                      placeholder="cs_xxxxxxxxxxxxxxxx"
                      placeholderTextColor={colors.onSurfaceVariant}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!showSecret}
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          paddingRight: 44,
                          color: colors.onSurface,
                          backgroundColor: colors.background,
                          borderColor: colors.outline,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={() => setShowSecret((prev) => !prev)}
                      style={styles.eyeBtn}
                      accessibilityLabel={showSecret ? 'Hide secret' : 'Show secret'}
                    >
                      <Ionicons
                        name={showSecret ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                    Store Label (Optional)
                  </Text>
                  <TextInput
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="e.g. NextEcom Store"
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
                </View>

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                    <Ionicons name="alert-circle" size={18} color={colors.onErrorContainer} />
                    <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleConnect}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: loading || pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons name="link-outline" size={18} color={colors.onPrimary} />
                      <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                        Verify & Launch Storefront
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            <View
              style={[
                styles.securityCard,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.tertiary} />
              <Text style={[styles.securityText, { color: colors.onSurfaceVariant }]}>
                Credentials are stored inside the device keychain/keystore via Expo SecureStore and sent exclusively over HTTPS.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={guideOpen} transparent animationType="fade" onRequestClose={() => setGuideOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              WooCommerce API Setup
            </Text>
            <Text style={[styles.modalBody, { color: colors.onSurfaceVariant }]}>
              1. In WordPress Admin, open WooCommerce → Settings → Advanced → REST API.{'\n\n'}
              2. Click &quot;Add key&quot;, enter a description (e.g. cwgapp Mobile), and set Permissions to Read/Write so cart checkout, reviews, and customer sign-up work.{'\n\n'}
              3. Ensure Permalinks (Settings → Permalinks) are set to Post name or any pretty structure so /wp-json/wc/v3/ routes resolve cleanly.{'\n\n'}
              4. For WordPress customer login, install &quot;JWT Authentication for WP REST API&quot; or use WordPress Application Passwords.
            </Text>
            <Pressable
              onPress={() => setGuideOpen(false)}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroWrap: {
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,22,21,0.52)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { gap: 6 },
  pillBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#FFFFFF',
  },
  heroTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    color: '#FAF8F5',
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#EDE7DF',
  },
  body: {
    padding: 18,
    gap: 18,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  connectedCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  connectedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },
  savedUrl: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  activeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeChipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  enterStoreBtn: {
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  enterStoreBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  connectAnotherBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectAnotherText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  backToConnectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backToConnectedText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  formCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
  },
  guideBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
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
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  securityText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
  },
  modalBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
