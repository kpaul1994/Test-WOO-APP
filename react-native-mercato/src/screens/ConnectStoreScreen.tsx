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
      if (allowCancel && navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to store.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (url: string) => {
    await switchStore(url);
    if (allowCancel && navigation.canGoBack()) {
      navigation.goBack();
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
                <View style={styles.pillBadge}>
                  <Ionicons name="storefront-outline" size={14} color="#FAF8F5" />
                  <Text style={styles.pillBadgeText}>WOOCOMMERCE READY</Text>
                </View>
                <Text style={styles.heroTitle}>Mercato</Text>
                <Text style={styles.heroSub}>
                  Connect any WooCommerce store URL & REST keys to launch a live native storefront.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            {savedStores.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                  Saved Stores
                </Text>
                <View style={{ gap: 10 }}>
                  {savedStores.map((store) => {
                    const isCurrent = activeStore?.storeUrl === store.storeUrl;
                    return (
                      <Pressable
                        key={store.storeUrl}
                        onPress={() => handleQuickSwitch(store.storeUrl)}
                        style={[
                          styles.savedCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isCurrent ? colors.secondary : colors.outlineVariant,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.storeAvatar,
                            { backgroundColor: colors.primaryContainer },
                          ]}
                        >
                          <Ionicons
                            name="bag-handle-outline"
                            size={18}
                            color={colors.onPrimaryContainer}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.savedName, { color: colors.onSurface }]}
                          >
                            {store.storeName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.savedUrl, { color: colors.onSurfaceVariant }]}
                          >
                            {store.storeUrl}
                          </Text>
                        </View>
                        {isCurrent ? (
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
                              ACTIVE
                            </Text>
                          </View>
                        ) : null}
                        <Pressable
                          onPress={() => removeSavedStore(store.storeUrl)}
                          hitSlop={10}
                          accessibilityLabel={`Remove ${store.storeName}`}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={colors.onSurfaceVariant}
                          />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.formCard,
                { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
              ]}
            >
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
                  placeholder="My Boutique"
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
              2. Click "Add key", enter a description (e.g. Mercato Mobile), and set Permissions to Read/Write so cart checkout, reviews, and customer sign-up work.{'\n\n'}
              3. Ensure Permalinks (Settings → Permalinks) are set to Post name or any pretty structure so /wp-json/wc/v3/ routes resolve cleanly.{'\n\n'}
              4. For WordPress customer login, install "JWT Authentication for WP REST API" or use WordPress Application Passwords.
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
    backgroundColor: 'rgba(196,93,62,0.9)',
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
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  storeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
  },
  savedUrl: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  activeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeChipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
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
