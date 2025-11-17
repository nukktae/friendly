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
        >
          <Ionicons name="filter-outline" size={16} color="#000" />
          <Text style={styles.filterText} numberOfLines={1}>{selectedCategory}</Text>
          <Ionicons name="chevron-down" size={14} color="#999" />
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdown} nestedScrollEnabled>
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
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedCategory === category && styles.dropdownItemTextActive
                ]}>
                  {category}
                </Text>
                {selectedCategory === category && (
                  <Ionicons name="checkmark" size={18} color="#000" />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 240,
  },
  dropdown: {
    borderRadius: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f8f8f8',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#000',
  },
});

