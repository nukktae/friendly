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
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (course) {
      setName(course.name);
      setCredits(course.credits.toString());
      setGrade(course.grade);
      setSemester(course.semester || '');
      setYear(course.year?.toString() || '');
    } else {
      resetForm();
    }
  }, [course, visible]);

  const resetForm = () => {
    setName('');
    setCredits('');
    setGrade('');
    setSemester('');
    setYear('');
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

    onSave({
      name: name.trim(),
      credits: parseFloat(credits),
      grade: grade.trim(),
      semester: semester.trim() || undefined,
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
          <View style={styles.header}>
            <Text style={styles.title}>
              {course ? 'Edit Course' : 'Add Course'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color="#71717A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Course Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Introduction to Computer Science"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#A1A1AA"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth, styles.leftHalf]}>
                  <Text style={styles.label}>Credits</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    value={credits}
                    onChangeText={setCredits}
                    keyboardType="numeric"
                    placeholderTextColor="#A1A1AA"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth, styles.rightHalf]}>
                  <Text style={styles.label}>Grade</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="A"
                    value={grade}
                    onChangeText={setGrade}
                    placeholderTextColor="#A1A1AA"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth, styles.leftHalf]}>
                  <Text style={styles.label}>Semester</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Fall"
                    value={semester}
                    onChangeText={setSemester}
                    placeholderTextColor="#A1A1AA"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth, styles.rightHalf]}>
                  <Text style={styles.label}>Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2024"
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                    placeholderTextColor="#A1A1AA"
                  />
                </View>
              </View>

              <View style={styles.gradeInfo}>
                <Text style={styles.gradeInfoText}>
                  A+ to F or 0.0 to 4.0
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.button, styles.saveButton]}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E4E4E7',
  },
  title: {
    fontSize: 17,
    fontWeight: '500',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  halfWidth: {
    flex: 1,
  },
  leftHalf: {
    marginRight: 6,
  },
  rightHalf: {
    marginLeft: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#18181B',
    borderWidth: 0.5,
    borderColor: '#E4E4E7',
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
  },
  gradeInfo: {
    marginTop: 4,
    paddingTop: 12,
  },
  gradeInfoText: {
    fontSize: 11,
    color: '#A1A1AA',
    letterSpacing: -0.1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#E4E4E7',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FAFAFA',
    borderWidth: 0.5,
    borderColor: '#E4E4E7',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3F3F46',
    letterSpacing: -0.2,
  },
  saveButton: {
    backgroundColor: '#18181B',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

