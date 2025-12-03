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
  // Visible categories shown as buttons
  const visibleCategories = ['General', 'Study Groups'];
  
  // Categories that go in the "More" dropdown
  const moreCategories = categories.filter(cat => !visibleCategories.includes(cat));
  
  // Check if selected category is from the "More" dropdown
  const isMoreCategorySelected = moreCategories.includes(selectedCategory);

  return (
    <>
      <View style={styles.filterBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtonsContainer}
        >
          {visibleCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive
              ]}
              onPress={() => onCategorySelect(category)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterButtonText,
                selectedCategory === category && styles.filterButtonTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              styles.moreButton,
              (showDropdown || isMoreCategorySelected) && styles.moreButtonActive
            ]}
            onPress={onToggleDropdown}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterButtonText,
              (showDropdown || isMoreCategorySelected) && styles.filterButtonTextActive
            ]}>
              More
            </Text>
            <Ionicons 
              name={showDropdown ? "chevron-up" : "chevron-down"} 
              size={14} 
              color={(showDropdown || isMoreCategorySelected) ? "#0F3F2E" : "#6B7280"} 
              style={styles.moreIcon}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdown} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {moreCategories.map((category) => (
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
                  <Ionicons name="checkmark" size={16} color="#0F3F2E" />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#0F3F2E',
    borderColor: '#0F3F2E',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreButtonActive: {
    backgroundColor: '#0F3F2E',
    borderColor: '#0F3F2E',
  },
  moreIcon: {
    marginLeft: 2,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdown: {
    borderRadius: 18,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(15, 63, 46, 0.05)',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.2,
  },
  dropdownItemTextActive: {
    fontWeight: '500',
    color: '#0F3F2E',
  },
});

