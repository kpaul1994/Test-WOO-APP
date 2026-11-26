import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastBanner } from './src/components/ToastBanner';
import { AppProvider, useApp } from './src/context/AppContext';
import { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { AccountScreen } from './src/screens/AccountScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { ConnectStoreScreen } from './src/screens/ConnectStoreScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProductDetailScreen } from './src/screens/ProductDetailScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';
import { Fonts } from './src/theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  const { colors, cartCount, wishlistItems } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodySemiBold,
          fontSize: 11,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Explore') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'Saved') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Bag') iconName = focused ? 'bag-handle' : 'bag-handle-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen
        name="Saved"
        component={WishlistScreen}
        options={{
          tabBarBadge: wishlistItems.length > 0 ? wishlistItems.length : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.secondary, color: '#FFFFFF' },
        }}
      />
      <Tab.Screen
        name="Bag"
        component={CartScreen}
        options={{
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.secondary, color: '#FFFFFF' },
        }}
      />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const { bootstrapping, activeStore, colors, isDark } = useApp();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = activeStore?.storeName || 'NextEcom';
    }
  }, [activeStore]);

  if (bootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
      notification: colors.secondary,
    },
  };

  return (
    <NavigationContainer
      theme={navTheme}
      documentTitle={{
        enabled: true,
        formatter: (_options, route) => {
          const storeName = activeStore?.storeName || 'NextEcom';
          if (!route || route.name === 'MainTabs') return storeName;
          const map: Record<string, string> = {
            ConnectStore: 'Connect Store',
            ProductDetail: 'Product Details',
            Checkout: 'Checkout',
          };
          return `${map[route.name] || route.name} • ${storeName}`;
        },
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={activeStore ? 'MainTabs' : 'ConnectStore'}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="ConnectStore" component={ConnectStoreScreen} />
      </Stack.Navigator>
      <ToastBanner />
    </NavigationContainer>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F5' }}>
        <ActivityIndicator size="large" color="#C45D3E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
