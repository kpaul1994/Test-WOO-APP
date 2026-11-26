import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Explore: { initialCategoryId?: number; initialSearch?: string } | undefined;
  Saved: undefined;
  Bag: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ProductDetail: { productId: number };
  Checkout: { couponCode?: string | null; discountAmount?: number } | undefined;
  ConnectStore: { allowCancel?: boolean } | undefined;
};
