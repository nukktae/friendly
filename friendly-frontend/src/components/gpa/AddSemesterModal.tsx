import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatSemester, getCurrentSemester, getNextSemester, parseSemester } from '@/src/utils/semesterUtils';

interface AddSemesterModalProps {
  visible: boolean;
  existingSemesters: string[];
  onClose: () => void;
  onSave: (semester: string) => void;
}

export const AddSemesterModal: React.FC<AddSemesterModalProps> = ({
  visible,
  existingSemesters,
  onClose,
  onSave,
}) => {
  const currentSemester = getCurrentSemester();
  const currentParsed = parseSemester(currentSemester);
  
  const [selectedYear, setSelectedYear] = useState<number>(
    currentParsed ? (currentParsed.semester === 1 ? currentParsed.year + 1 : currentParsed.year) : new Date().getFullYear() + 1
  );
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1); // 1 = Fall, 2 = Spring

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  const handleSave = () => {
    const newSemester = formatSemester(selectedYear, selectedSemester);
    
    // Check for duplicates
    if (existingSemesters.includes(newSemester)) {
      alert('This semester already exists');
      return;
    }
    
    onSave(newSemester);
    onClose();
  };

  const handleClose = () => {
    // Reset to defaults
    const currentParsed = parseSemester(currentSemester);
    if (currentParsed) {
      setSelectedYear(currentParsed.semester === 1 ? currentParsed.year + 1 : currentParsed.year);
      setSelectedSemester(currentParsed.semester === 1 ? 2 : 1);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Add New Semester</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {/* Year Select */}
                <View style={styles.section}>
                  <Text style={styles.label}>Year</Text>
                  <View style={styles.pickerContainer}>
                    <ScrollView
                      style={styles.pickerScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {years.map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.pickerItem,
                            selectedYear === year && styles.pickerItemActive,
                          ]}
                          onPress={() => setSelectedYear(year)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pickerItemText}>
                            {year}
                          </Text>
                          {selectedYear === year && (
                            <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Semester Select */}
                <View style={styles.section}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.semesterButtons}>
                    <TouchableOpacity
                      style={[
                        styles.semesterCapsule,
                        selectedSemester === 1 && styles.semesterCapsuleActive,
                      ]}
                      onPress={() => setSelectedSemester(1)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.semesterCapsuleText,
                          selectedSemester === 1 && styles.semesterCapsuleTextActive,
                        ]}
                      >
                        Fall
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.semesterCapsule,
                        selectedSemester === 2 && styles.semesterCapsuleActive,
                      ]}
                      onPress={() => setSelectedSemester(2)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.semesterCapsuleText,
                          selectedSemester === 2 && styles.semesterCapsuleTextActive,
                        ]}
                      >
                        Spring
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preview Box */}
                <View style={styles.preview}>
                  <Ionicons name="calendar-outline" size={16} color="#444444" />
                  <Text style={styles.previewText}>
                    New Semester: {formatSemester(selectedYear, selectedSemester)}
                  </Text>
                </View>
              </View>

              {/* Footer Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.9}
                >
                  <Text style={styles.saveButtonText}>Add Semester</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 50,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.3,
    flex: 1,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
  },
  content: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  pickerContainer: {
    maxHeight: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 240,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(15, 63, 46, 0.07)',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#131313',
    letterSpacing: -0.2,
  },
  semesterButtons: {
    flexDirection: 'row',
    gap: 14,
  },
  semesterCapsule: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterCapsuleActive: {
    backgroundColor: 'rgba(15, 63, 46, 0.09)',
    borderWidth: 1.5,
    borderColor: '#0F3F2E',
  },
  semesterCapsuleText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#555555',
    letterSpacing: -0.2,
  },
  semesterCapsuleTextActive: {
    color: '#0F3F2E',
    fontWeight: '500',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDEDED',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#444444',
    letterSpacing: -0.2,
  },
  footer: {
    flexDirection: 'row',
    gap: 14,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9E9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444444',
    letterSpacing: -0.2,
  },
  saveButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#0F3F2E',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F3F2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

