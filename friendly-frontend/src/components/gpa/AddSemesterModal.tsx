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
              <View style={styles.header}>
                <Text style={styles.title}>Add New Semester</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <View style={styles.section}>
                  <Text style={styles.label}>Year</Text>
                  <ScrollView
                    style={styles.pickerContainer}
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
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            selectedYear === year && styles.pickerItemTextActive,
                          ]}
                        >
                          {year}
                        </Text>
                        {selectedYear === year && (
                          <Ionicons name="checkmark" size={18} color="#426b1f" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.semesterButtons}>
                    <TouchableOpacity
                      style={[
                        styles.semesterButton,
                        selectedSemester === 1 && styles.semesterButtonActive,
                      ]}
                      onPress={() => setSelectedSemester(1)}
                    >
                      <Text
                        style={[
                          styles.semesterButtonText,
                          selectedSemester === 1 && styles.semesterButtonTextActive,
                        ]}
                      >
                        Fall
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.semesterButton,
                        selectedSemester === 2 && styles.semesterButtonActive,
                      ]}
                      onPress={() => setSelectedSemester(2)}
                    >
                      <Text
                        style={[
                          styles.semesterButtonText,
                          selectedSemester === 2 && styles.semesterButtonTextActive,
                        ]}
                      >
                        Spring
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>New Semester:</Text>
                  <Text style={styles.previewValue}>
                    {formatSemester(selectedYear, selectedSemester)}
                  </Text>
                </View>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  pickerContainer: {
    maxHeight: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerItemActive: {
    backgroundColor: '#F0F4ED',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerItemTextActive: {
    color: '#426b1f',
    fontWeight: '600',
  },
  semesterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  semesterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  semesterButtonActive: {
    backgroundColor: '#F0F4ED',
    borderColor: '#426b1f',
  },
  semesterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  semesterButtonTextActive: {
    color: '#426b1f',
    fontWeight: '600',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F4ED',
    borderRadius: 10,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#426b1f',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#426b1f',
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

