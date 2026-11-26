export interface MobileBannerItem {
  id?: number | string;
  title: string;
  subtitle?: string;
  image: string;
  cta_text?: string;
  target?: string;
}

export interface TrustBadgeItem {
  icon: string;
  title: string;
  description?: string;
  sub?: string;
}

export interface MobileSectionConfig {
  uid: string;
  type: string;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  banners?: MobileBannerItem[];
  timer?: string;
  badge?: string;
  headline?: string;
  desc?: string;
  image?: string;
  cta_text?: string;
  target?: string;
  source?: string;
  limit?: number;
  items?: TrustBadgeItem[];
}

export interface MobileConfigResponse {
  app_name?: string;
  app_tagline?: string;
  app_logo?: string;
  logo?: string;
  logo_url?: string;
  site_logo?: string;
  site_icon_url?: string;
  splash_screen_image?: string;
  splash_image_url?: string;
  splash_bg_color?: string;
  primary_color?: string;
  secondary_color?: string;
  bg_color?: string;
  card_bg?: string;
  text_color?: string;
  announcement_bar?: string;
  announcement_enabled?: boolean;
  currency_symbol?: string;
  pages?: {
    home?: {
      title?: string;
      sections?: MobileSectionConfig[];
    };
    shop?: {
      title?: string;
      sections?: MobileSectionConfig[];
    };
    profile?: {
      title?: string;
      sections?: MobileSectionConfig[];
    };
  };
  feature_toggles?: {
    enable_wishlist?: boolean;
    enable_search?: boolean;
    enable_coupons?: boolean;
    enable_guest_checkout?: boolean;
    enable_ratings?: boolean;
    maintenance_mode?: boolean;
  };
}

export interface WpSectionCardItem {
  label: string;
  image?: string;
  link?: string;
  price?: string | null;
}

export interface WpHomepageSections {
  carousel_1?: WpSectionCardItem[];
  featured?: WpSectionCardItem[];
  accessories?: WpSectionCardItem[];
  shoes?: WpSectionCardItem[];
  jewelry_box?: WpSectionCardItem[];
  stories?: WpSectionCardItem[];
  carousel_2?: WpSectionCardItem[];
  home_edit?: WpSectionCardItem[];
}

export interface WpThemeOptions {
  announcement_text?: string;
  announcement_code?: string;
  hero_badge?: string;
  hero_heading?: string;
  hero_subheading?: string;
  hero_image?: string;
  hero_cta_primary_text?: string;
  hero_cta_primary_link?: string;
  hero_cta_secondary_text?: string;
  hero_cta_secondary_link?: string;
  card_a_title?: string;
  card_a_subtitle?: string;
  card_a_image?: string;
  card_a_link?: string;
  card_b_title?: string;
  card_b_subtitle?: string;
  card_b_image?: string;
  card_b_link?: string;
  feature_image?: string;
  feature_heading?: string;
  feature_text?: string;
  feature_cta_text?: string;
  feature_cta_link?: string;
  newsletter_heading?: string;
  newsletter_text?: string;
  trust_1_icon?: string;
  trust_1_title?: string;
  trust_1_subtitle?: string;
  trust_2_icon?: string;
  trust_2_title?: string;
  trust_2_subtitle?: string;
  trust_3_icon?: string;
  trust_3_title?: string;
  trust_3_subtitle?: string;
  trust_4_icon?: string;
  trust_4_title?: string;
  trust_4_subtitle?: string;
  trust_5_icon?: string;
  trust_5_title?: string;
  trust_5_subtitle?: string;
}
