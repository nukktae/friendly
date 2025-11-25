import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FilterBarProps {
  selectedCategory: string;
  categories: string[];
  onCategorySelect: (category: string) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  categories,
  onCategorySelect,
  showDropdown,
  onToggleDropdown,
}) => {
  return (
    <>
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={onToggleDropdown}
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={15} color="#4B5563" />
          <Text style={styles.filterText} numberOfLines={1}>{selectedCategory}</Text>
          <Ionicons name="chevron-down" size={13} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdown} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.dropdownItem,
                  selectedCategory === category && styles.dropdownItemActive
                ]}
                onPress={() => {
                  onCategorySelect(category);
                  onToggleDropdown();
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedCategory === category && styles.dropdownItemTextActive
                ]}>
                  {category}
                </Text>
                {selectedCategory === category && (
                  <Ionicons name="checkmark" size={16} color="#111827" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdown: {
    borderRadius: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#F9FAFB',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#111827',
  },
});

