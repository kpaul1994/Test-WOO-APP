import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Fonts } from '../theme/theme';

export interface SelectOption {
  code: string;
  name: string;
  subtitle?: string;
}

interface SearchableSelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedCode?: string;
  onSelect: (option: SelectOption) => void;
  onClose: () => void;
}

export const SearchableSelectModal: React.FC<SearchableSelectModalProps> = ({
  visible,
  title,
  options,
  selectedCode,
  onSelect,
  onClose,
}) => {
  const { colors } = useApp();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? options.filter(
        (opt) =>
          opt.name.toLowerCase().includes(query.toLowerCase()) ||
          opt.code.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchWrap,
              { backgroundColor: colors.background, borderColor: colors.outline },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.onSurfaceVariant} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${title.toLowerCase()}...`}
              placeholderTextColor={colors.onSurfaceVariant}
              style={[styles.searchInput, { color: colors.onSurface }]}
              autoFocus={Platform.OS !== 'web'}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = item.code.toUpperCase() === (selectedCode || '').toUpperCase();
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={[
                    styles.itemRow,
                    {
                      backgroundColor: isSelected
                        ? colors.secondaryContainer
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.itemName,
                        {
                          color: isSelected ? colors.onSecondaryContainer : colors.onSurface,
                          fontFamily: isSelected ? Fonts.bodySemiBold : Fonts.body,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.code ? (
                      <Text
                        style={[
                          styles.itemCode,
                          {
                            color: isSelected
                              ? colors.onSecondaryContainer
                              : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        Code: {item.code}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                  No matches found for &quot;{query}&quot;
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  itemName: {
    fontSize: 14,
  },
  itemCode: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    marginTop: 2,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
});
