import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Course, GRADE_POINTS } from '@/src/types/gpa.types';
import { formatSemester, parseSemester } from '@/src/utils/semester';

const gradeOptions = GRADE_POINTS.map(gp => gp.grade);
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

interface AddCourseModalProps {
  visible: boolean;
  course?: Course | null;
  onClose: () => void;
  onSave: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  visible,
  course,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('');
  const [grade, setGrade] = useState('');
  const [semester, setSemester] = useState<'Fall' | 'Spring'>('Fall');
  const [year, setYear] = useState<string>(currentYear.toString());
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setName(course.name);
      setCredits(course.credits.toString());
      setGrade(course.grade);
      
      // Parse semester string (e.g., "2023 Spring") or use separate semester/year
      if (course.semester) {
        const parsed = parseSemester(course.semester);
        if (parsed) {
          setSemester(parsed.semester === 1 ? 'Fall' : 'Spring');
          setYear(parsed.year.toString());
        } else {
          // Fallback: try to parse from semester string
          const courseSemester = course.semester.toLowerCase();
          if (courseSemester.includes('fall')) {
            setSemester('Fall');
          } else if (courseSemester.includes('spring')) {
            setSemester('Spring');
          } else {
            setSemester('Fall');
          }
          setYear(course.year?.toString() || currentYear.toString());
        }
      } else {
        setSemester('Fall');
        setYear(course.year?.toString() || currentYear.toString());
      }
    } else {
      resetForm();
    }
  }, [course, visible]);

  const resetForm = () => {
    setName('');
    setCredits('');
    setGrade('');
    setSemester('Fall');
    setYear(currentYear.toString());
    setFocusedInput(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    if (!credits || parseFloat(credits) <= 0) {
      Alert.alert('Error', 'Please enter valid credits');
      return;
    }
    if (!grade.trim()) {
      Alert.alert('Error', 'Please enter a grade');
      return;
    }

    // Format semester as "2023 Spring" format
    const semesterNum = semester === 'Fall' ? 1 : 2;
    const fullSemester = year ? formatSemester(parseInt(year), semesterNum) : undefined;
    
    onSave({
      name: name.trim(),
      credits: parseFloat(credits),
      grade: grade.trim(),
      semester: fullSemester,
      year: year ? parseInt(year) : undefined,
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Add Course</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#9A9A9A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              {/* Course Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Course Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputLarge,
                    focusedInput === 'name' && styles.inputFocused,
                  ]}
                  placeholder="Introduction to Computer Science"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#9CA3AF"
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Credits + Grade Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth, styles.leftHalf]}>
                  <Text style={styles.label}>Credits</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'credits' && styles.inputFocused,
                    ]}
                    placeholder="3"
                    value={credits}
                    onChangeText={setCredits}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocusedInput('credits')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth, styles.rightHalf]}>
                  <Text style={styles.label}>Grade</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.gradeInput,
                      focusedInput === 'grade' && styles.inputFocused,
                    ]}
                    onPress={() => {
                      setFocusedInput('grade');
                      setShowGradeDropdown(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.gradeInputText, !grade && styles.gradeInputPlaceholder]}>
                      {grade || 'A'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Semester + Year Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth, styles.leftHalf]}>
                  <Text style={styles.label}>Semester</Text>
                  <View style={styles.semesterSelector}>
                    <TouchableOpacity
                      style={[
                        styles.semesterPill,
                        semester === 'Fall' && styles.semesterPillActive,
                      ]}
                      onPress={() => setSemester('Fall')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.semesterPillText,
                          semester === 'Fall' && styles.semesterPillTextActive,
                        ]}
                      >
                        Fall
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.semesterPill,
                        semester === 'Spring' && styles.semesterPillActive,
                      ]}
                      onPress={() => setSemester('Spring')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.semesterPillText,
                          semester === 'Spring' && styles.semesterPillTextActive,
                        ]}
                      >
                        Spring
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth, styles.rightHalf]}>
                  <Text style={styles.label}>Year</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.yearInput,
                      focusedInput === 'year' && styles.inputFocused,
                    ]}
                    onPress={() => {
                      setFocusedInput('year');
                      setShowYearDropdown(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.yearInputText}>{year}</Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* GPA Info */}
              <View style={styles.gradeInfo}>
                <Text style={styles.gradeInfoText}>
                  A+ to F or 0.0 to 4.0
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveButton}
              activeOpacity={0.9}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Grade Dropdown */}
      {showGradeDropdown && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGradeDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowGradeDropdown(false);
              setFocusedInput(null);
            }}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {gradeOptions.map((gradeOption) => (
                  <TouchableOpacity
                    key={gradeOption}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setGrade(gradeOption);
                      setShowGradeDropdown(false);
                      setFocusedInput(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{gradeOption}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Year Dropdown */}
      {showYearDropdown && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowYearDropdown(false);
              setFocusedInput(null);
            }}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {yearOptions.map((yearOption) => (
                  <TouchableOpacity
                    key={yearOption}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setYear(yearOption.toString());
                      setShowYearDropdown(false);
                      setFocusedInput(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{yearOption}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 50,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111111',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  halfWidth: {
    flex: 1,
  },
  leftHalf: {
    marginRight: 7,
  },
  rightHalf: {
    marginLeft: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8A8A8A',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.2,
    minHeight: 44,
  },
  inputLarge: {
    minHeight: 50,
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: '#0F3F2E',
    backgroundColor: '#FFFFFF',
  },
  gradeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeInputText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
  },
  gradeInputPlaceholder: {
    color: '#9CA3AF',
  },
  yearInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearInputText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  semesterSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  semesterPill: {
    flex: 1,
    height: 44,
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterPillActive: {
    backgroundColor: 'rgba(15, 63, 46, 0.1)',
    borderWidth: 1.5,
    borderColor: '#0F3F2E',
  },
  semesterPillText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#555555',
    letterSpacing: -0.2,
  },
  semesterPillTextActive: {
    color: '#0F3F2E',
    fontWeight: '500',
  },
  gradeInfo: {
    marginTop: 16,
  },
  gradeInfoText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8A8A8A',
    letterSpacing: -0.1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 14,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E7E7',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '70%',
    maxWidth: 200,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
    letterSpacing: -0.2,
  },
});

