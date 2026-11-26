import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Fonts } from '../theme/theme';

export const ToastBanner: React.FC = () => {
  const { toastMessage, dismissToast, colors } = useApp();
  const insets = useSafeAreaInsets();

  if (!toastMessage) return null;

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom + 76, 84) }]} pointerEvents="box-none">
      <Pressable
        onPress={dismissToast}
        style={[
          styles.banner,
          {
            backgroundColor: colors.primary,
            shadowColor: '#000',
          },
        ]}
      >
        <Text numberOfLines={2} style={[styles.text, { color: colors.onPrimary }]}>
          {toastMessage}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  banner: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  text: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
  },
});
