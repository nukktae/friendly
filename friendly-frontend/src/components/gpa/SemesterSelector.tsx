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
        activeOpacity={0.7}
      >
        <Text style={styles.selectedText} numberOfLines={1}>
          {getSemesterDisplayName(selectedSemester)}
        </Text>
        <Ionicons 
          name={showDropdown ? "chevron-up" : "chevron-down"} 
          size={16} 
          color="#134A35" 
          style={{ opacity: 0.6 }}
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
                  ]}
                  onPress={() => handleSelect(semester)}
                  activeOpacity={0.6}
                >
                  {isAddNew ? (
                    <View style={styles.addNewContent}>
                      <Ionicons name="add-outline" size={18} color="#6B6B6B" />
                      <Text style={styles.addNewText}>Add New Semester</Text>
                    </View>
                  ) : (
                    <View style={styles.itemContent}>
                      <Text style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextActive,
                      ]}>
                        {getSemesterDisplayName(semester)}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#134A35" />
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
    marginBottom: 20,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    minHeight: 48,
  },
  selectedText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    maxHeight: 320,
    zIndex: 1001,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdown: {
    maxHeight: 320,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(19, 74, 53, 0.05)',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  dropdownItemTextActive: {
    color: '#134A35',
    fontWeight: '500',
  },
  addNewItem: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    marginTop: 4,
    paddingTop: 16,
  },
  addNewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addNewText: {
    fontSize: 15,
    color: '#6B6B6B',
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  emptyDropdown: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B6B',
    fontWeight: '400',
  },
});

