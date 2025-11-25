import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  generateSemesterList,
  getCurrentSemester,
  getSemesterDisplayName,
} from '@/src/utils/semesterUtils';

interface SemesterSelectorProps {
  selectedSemester: string;
  onSemesterSelect: (semester: string) => void;
  onAddNewSemester: () => void;
  availableSemesters?: string[]; // Optional: semesters that have courses
}

export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
  selectedSemester,
  onSemesterSelect,
  onAddNewSemester,
  availableSemesters = [],
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Generate semester list from 2023 Spring to current
  const allSemesters = generateSemesterList(2023, 2); // 2 = Spring
  const currentSemester = getCurrentSemester();
  
  // Combine all semesters with "Add New Semester" option
  const dropdownItems = [...allSemesters, 'ADD_NEW'];

  const handleSelect = (semester: string) => {
    if (semester === 'ADD_NEW') {
      onAddNewSemester();
    } else {
      onSemesterSelect(semester);
    }
    setShowDropdown(false);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowDropdown(!showDropdown)}
        activeOpacity={0.6}
      >
        <Text style={styles.selectedText} numberOfLines={1}>
          {getSemesterDisplayName(selectedSemester)}
        </Text>
        <Ionicons 
          name={showDropdown ? "chevron-up" : "chevron-down"} 
          size={14} 
          color="#9CA3AF" 
        />
      </TouchableOpacity>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
            <ScrollView 
              style={styles.dropdown} 
              nestedScrollEnabled 
              showsVerticalScrollIndicator={false}
            >
            {dropdownItems.length > 0 ? dropdownItems.map((semester, index) => {
              const isSelected = semester === selectedSemester;
              const isAddNew = semester === 'ADD_NEW';
              const isCurrent = semester === currentSemester;
              
              return (
                <TouchableOpacity
                  key={semester}
                  style={[
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemActive,
                    isAddNew && styles.addNewItem,
                    index === 0 && styles.firstItem,
                  ]}
                  onPress={() => handleSelect(semester)}
                  activeOpacity={0.5}
                >
                  {isAddNew ? (
                    <View style={styles.addNewContent}>
                      <Ionicons name="add" size={16} color="#6366F1" />
                      <Text style={styles.addNewText}>Add New Semester</Text>
                    </View>
                  ) : (
                    <View style={styles.itemContent}>
                      <View style={styles.itemLeft}>
                      <Text style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextActive,
                      ]}>
                        {getSemesterDisplayName(semester)}
                      </Text>
                        {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#6366F1" />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyDropdown}>
                <Text style={styles.emptyText}>No semesters available</Text>
              </View>
            )}
            </ScrollView>
          </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E4E4E7',
    marginBottom: 8,
    minHeight: 36,
  },
  selectedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.2,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E4E4E7',
    maxHeight: 280,
    zIndex: 1001,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdown: {
    maxHeight: 280,
  },
  dropdownItem: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F4F4F5',
  },
  firstItem: {
    paddingTop: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#F8F9FF',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#3F3F46',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  dropdownItemTextActive: {
    color: '#6366F1',
    fontWeight: '500',
  },
  addNewItem: {
    borderTopWidth: 0.5,
    borderTopColor: '#E4E4E7',
    marginTop: 2,
    paddingTop: 10,
    backgroundColor: '#FAFAFA',
  },
  addNewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addNewText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  currentBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyDropdown: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '400',
  },
});

