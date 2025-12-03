import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/src/context/AppContext';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Lecture } from '@/src/types/lecture.types';
import { Course, GRADE_POINTS } from '@/src/types/gpa.types';
import { getLectures, updateLecture, deleteLecture } from '@/src/services/lecture/lectureService';
import { SemesterSelector } from './SemesterSelector';
import { EmptySemesterView } from './EmptySemesterView';
import { AddSemesterModal } from './AddSemesterModal';
import { AddCourseModal } from './AddCourseModal';
import { getCurrentSemester, generateSemesterList } from '@/src/utils/semesterUtils';
import { ENV } from '@/src/config/env';

interface SyncClassesSectionProps {
  existingCourses: Course[];
  onAddCourse: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

interface ClassWithInputs {
  lecture: Lecture;
  credits: string;
  grade: string;
}

export const SyncClassesSection: React.FC<SyncClassesSectionProps> = ({
  existingCourses,
  onAddCourse,
}) => {
  const { userProfile, user } = useApp();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [classInputs, setClassInputs] = useState<Record<string, ClassWithInputs>>({});
  const [addingCourseId, setAddingCourseId] = useState<string | null>(null);
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deletingLectureId, setDeletingLectureId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lectureToDelete, setLectureToDelete] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>(getCurrentSemester());
  const [showAddSemesterModal, setShowAddSemesterModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [showGradeDropdown, setShowGradeDropdown] = useState<string | null>(null);

  const userId = userProfile?.uid || user?.uid;

  useEffect(() => {
    if (userId) {
      loadLectures();
    }
  }, [userId, existingCourses.length]);

  // Update available semesters from existing courses
  useEffect(() => {
    const semesters = new Set<string>();
    existingCourses.forEach((course) => {
      if (course.semester) {
        semesters.add(course.semester);
      }
    });
    setAvailableSemesters(Array.from(semesters));
  }, [existingCourses]);

  const loadLectures = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await getLectures({ userId });
      setLectures(response.lectures || []);
      
      const inputs: Record<string, ClassWithInputs> = {};
      response.lectures.forEach((lecture) => {
        inputs[lecture.id] = {
          lecture,
          credits: '',
          grade: '',
        };
      });
      setClassInputs(inputs);
    } catch (error) {
      console.error('Failed to load lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lectures.length > 0) {
      const inputs: Record<string, ClassWithInputs> = {};
      lectures.forEach((lecture) => {
        if (classInputs[lecture.id]) {
          inputs[lecture.id] = classInputs[lecture.id];
        } else {
          inputs[lecture.id] = {
            lecture,
            credits: '',
            grade: '',
          };
        }
      });
      setClassInputs(inputs);
    }
  }, [lectures]);

  // Filter courses by selected semester
  const coursesForSemester = existingCourses.filter(
    (course) => course.semester === selectedSemester
  );

  // For current semester, show unsynced lectures
  // For past semesters, show courses for that semester
  const currentSemester = getCurrentSemester();
  const isCurrentSemester = selectedSemester === currentSemester;
  
  const unsyncedLectures = isCurrentSemester
    ? lectures.filter(
    (lecture) => !existingCourses.some((course) => course.name === lecture.title)
      )
    : [];

  const handleCreditsChange = (lectureId: string, credits: string) => {
    setClassInputs({
      ...classInputs,
      [lectureId]: {
        ...classInputs[lectureId],
        credits,
      },
    });
  };

  const handleGradeChange = (lectureId: string, grade: string) => {
    setClassInputs({
      ...classInputs,
      [lectureId]: {
        ...classInputs[lectureId],
        grade,
      },
    });
  };

  const handleEdit = (lecture: Lecture) => {
    setEditTitle(lecture.title);
    setEditDescription(lecture.description || '');
    setEditingLectureId(lecture.id);
  };

  const handleSaveEdit = async () => {
    if (!editingLectureId || !userId) return;

    try {
      await updateLecture(editingLectureId, userId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      await loadLectures();
      setEditingLectureId(null);
      setEditTitle('');
      setEditDescription('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update lecture');
    }
  };

  const handleDelete = (lectureId: string) => {
    console.log('[Delete] Delete button clicked for lecture:', lectureId);
    console.log('[Delete] User ID:', userId);
    
    if (!userId) {
      console.error('[Delete] User ID is missing!');
      Alert.alert('Error', 'User ID is missing. Please try again.');
      return;
    }

    if (!lectureId) {
      console.error('[Delete] Lecture ID is missing!');
      Alert.alert('Error', 'Lecture ID is missing.');
      return;
    }

    console.log('[Delete] Showing delete confirmation modal');
    setLectureToDelete(lectureId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!lectureToDelete || !userId) {
      console.error('[Delete] Missing lectureToDelete or userId');
      setShowDeleteConfirm(false);
      return;
    }

    const lectureId = lectureToDelete;
    console.log('[Delete] User confirmed deletion');
    
    try {
      setDeletingLectureId(lectureId);
      setShowDeleteConfirm(false);
      console.log('[Delete] Calling deleteLecture API...');
      console.log('[Delete] Parameters - lectureId:', lectureId, 'userId:', userId);
      
      await deleteLecture(lectureId, userId);
      
      console.log('[Delete] ✅ API call successful');
      
      // Remove from local state immediately for better UX
      console.log('[Delete] Updating local state...');
      setLectures(prev => {
        const filtered = prev.filter(l => l.id !== lectureId);
        console.log('[Delete] Lectures before:', prev.length, 'after:', filtered.length);
        return filtered;
      });
      
      setClassInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[lectureId];
        console.log('[Delete] Removed inputs for lecture:', lectureId);
        return newInputs;
      });
      
      console.log('[Delete] Reloading lectures from server...');
      // Reload from server to ensure consistency
      await loadLectures();
      console.log('[Delete] ✅ Delete process completed successfully');
    } catch (error: any) {
      console.error('[Delete] ❌ Error occurred:', error);
      console.error('[Delete] Error message:', error.message);
      console.error('[Delete] Error stack:', error.stack);
      Alert.alert('Error', error.message || 'Failed to delete lecture. Please try again.');
      // Reload lectures in case of error to sync state
      console.log('[Delete] Reloading lectures after error...');
      await loadLectures();
    } finally {
      console.log('[Delete] Clearing deleting state');
      setDeletingLectureId(null);
      setLectureToDelete(null);
    }
  };

  const handleAddToGPA = async (lectureId: string) => {
    const classInput = classInputs[lectureId];
    if (!classInput) return;

    const credits = parseFloat(classInput.credits);
    const grade = classInput.grade.trim();

    if (!classInput.lecture.title.trim()) {
      Alert.alert('Error', 'Course name is required');
      return;
    }
    if (!credits || credits <= 0) {
      Alert.alert('Error', 'Please enter valid credits');
      return;
    }
    if (!grade) {
      Alert.alert('Error', 'Please enter a grade');
      return;
    }

    try {
      setAddingCourseId(lectureId);
      
      const description = classInput.lecture.description || '';
      const semesterMatch = description.match(/Semester:\s*([^|]+)/i);
      const yearMatch = description.match(/Year:\s*(\d{4})/i);
      
      await onAddCourse({
        name: classInput.lecture.title,
        credits,
        grade,
        semester: selectedSemester, // Use selected semester
        year: yearMatch ? parseInt(yearMatch[1]) : undefined,
      });

      setClassInputs({
        ...classInputs,
        [lectureId]: {
          ...classInputs[lectureId],
          credits: '',
          grade: '',
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add course to GPA');
    } finally {
      setAddingCourseId(null);
    }
  };

  const handleAddNewSemester = () => {
    setShowAddSemesterModal(true);
  };

  const handleSaveNewSemester = (semester: string) => {
    setSelectedSemester(semester);
    setShowAddSemesterModal(false);
  };

  const handleAddManually = () => {
    setShowAddCourseModal(true);
  };

  const handleSaveManualCourse = async (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    await onAddCourse({
      ...course,
      semester: selectedSemester,
    });
    setShowAddCourseModal(false);
  };

  const handleUploadPhoto = async () => {
    try {
      // Request permission for photo library
      const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaResult.granted) {
          Alert.alert('Permission Required', 'Photo library access is required to select images.');
          return;
        }
      }

      // Open photo album
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const formData = new FormData();
      
      const filename = file.fileName || file.uri.split('/').pop() || 'requirements.jpg';
      
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('files', blob, filename);
      } else {
        formData.append('files', {
          uri: file.uri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      // Upload and analyze
      const analyzeResponse = await fetch(
        `${ENV.API_BASE || 'http://localhost:4000'}/api/gpa/${userId}/requirements/analyze`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze image');
      }

      const analyzeData = await analyzeResponse.json();
      
      // Extract courses from analysis and add them to selected semester
      if (analyzeData.analysis?.requiredCourses) {
        for (const course of analyzeData.analysis.requiredCourses) {
          await onAddCourse({
            name: course.nameKorean || course.name || 'Unknown Course',
            credits: course.credits || 3,
            grade: '', // User needs to fill in grade
            semester: selectedSemester,
          });
        }
        Alert.alert('Success', 'Courses extracted from image. Please add grades manually.');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', error.message || 'Failed to upload and analyze image');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#426b1f" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  // Show empty state if no courses for past semesters, or no unsynced lectures for current
  const isEmpty = isCurrentSemester 
    ? unsyncedLectures.length === 0 && coursesForSemester.length === 0
    : coursesForSemester.length === 0;

  return (
    <View style={styles.container}>
      <SemesterSelector
        selectedSemester={selectedSemester}
        onSemesterSelect={setSelectedSemester}
        onAddNewSemester={handleAddNewSemester}
        availableSemesters={availableSemesters}
      />

      {isEmpty ? (
        <EmptySemesterView
          semester={selectedSemester}
          onAddManually={handleAddManually}
          onUploadPhoto={handleUploadPhoto}
        />
      ) : (
        <>
          {isCurrentSemester && unsyncedLectures.length > 0 && (
            <View style={styles.classesContainer}>
      <View style={styles.classesList}>
        {unsyncedLectures.map((lecture) => {
          const classInput = classInputs[lecture.id];
          if (!classInput) return null;

          const isAdding = addingCourseId === lecture.id;
          const isDeleting = deletingLectureId === lecture.id;
          const canAdd = 
            classInput.credits.trim() &&
            classInput.grade.trim() &&
            parseFloat(classInput.credits) > 0;

          // Parse description for display
          const description = lecture.description || '';
          const dayMatch = description.match(/Day:\s*([^|]+)/i);
          const timeMatch = description.match(/Time:\s*([^|]+)/i);
          const placeMatch = description.match(/Place:\s*([^|]+)/i);

          return (
            <View key={lecture.id} style={styles.classCard}>
              <View style={styles.cardHeader}>
                <View style={styles.classInfo}>
                  <Text style={styles.className} numberOfLines={1}>
                    {lecture.title}
                  </Text>
                  {(dayMatch || timeMatch || placeMatch) && (
                    <View style={styles.metaRow}>
                      {dayMatch && (
                        <Text style={styles.metaText}>{dayMatch[1].trim()}</Text>
                      )}
                      {timeMatch && dayMatch && <Text style={styles.metaDot}>•</Text>}
                      {timeMatch && (
                        <Text style={styles.metaText}>{timeMatch[1].trim()}</Text>
                      )}
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[Delete] Delete button pressed for lecture:', lecture.id);
                    handleDelete(lecture.id);
                  }}
                  style={styles.deleteButton}
                  disabled={isAdding || isDeleting || deletingLectureId === lecture.id}
                  activeOpacity={0.6}
                >
                  {isDeleting && deletingLectureId === lecture.id ? (
                    <ActivityIndicator size="small" color="#9CA3AF" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputsRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Credits</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    value={classInput.credits}
                    onChangeText={(text) => handleCreditsChange(lecture.id, text)}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    editable={!isAdding && !isDeleting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Grade</Text>
                  <TouchableOpacity
                    style={styles.gradeInput}
                    onPress={() => setShowGradeDropdown(lecture.id)}
                    disabled={isAdding || isDeleting}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.gradeInputText, !classInput.grade && styles.gradeInputPlaceholder]}>
                      {classInput.grade || 'A'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Auto-add when both credits and grade are filled */}
              {canAdd && !isAdding && !isDeleting && (
                <TouchableOpacity
                  style={styles.autoAddButton}
                  onPress={() => handleAddToGPA(lecture.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.autoAddButtonText}>Add to GPA</Text>
                </TouchableOpacity>
              )}
              {isAdding && (
                <View style={styles.autoAddButton}>
                  <ActivityIndicator size="small" color="#134A35" />
                </View>
              )}
            </View>
          );
        })}
      </View>
      </View>
          )}

          {/* Show courses for selected semester (for past semesters) */}
          {!isCurrentSemester && coursesForSemester.length > 0 && (
            <View style={styles.classesContainer}>
              <View style={styles.classesList}>
                {coursesForSemester.map((course) => (
                  <View key={course.id} style={styles.classCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.classInfo}>
                        <Text style={styles.className} numberOfLines={1}>
                          {course.name}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaText}>{course.credits} credits</Text>
                          {course.grade && (
                            <>
                              <Text style={styles.metaDot}>•</Text>
                              <Text style={styles.metaText}>Grade: {course.grade}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingLectureId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditingLectureId(null);
          setEditTitle('');
          setEditDescription('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Lecture</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingLectureId(null);
                  setEditTitle('');
                  setEditDescription('');
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Title</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Lecture title"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Day: Mon | Time: 10:00 AM | Place: Room 101"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setEditingLectureId(null);
                  setEditTitle('');
                  setEditDescription('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Semester Modal */}
      <AddSemesterModal
        visible={showAddSemesterModal}
        existingSemesters={availableSemesters}
        onClose={() => setShowAddSemesterModal(false)}
        onSave={handleSaveNewSemester}
      />

      {/* Add Course Modal */}
      <AddCourseModal
        visible={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onSave={handleSaveManualCourse}
      />

      {/* Grade Dropdown Modal */}
      {showGradeDropdown && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGradeDropdown(null)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowGradeDropdown(null)}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={false}
              >
                {GRADE_POINTS.map((gp) => (
                  <TouchableOpacity
                    key={gp.grade}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleGradeChange(showGradeDropdown, gp.grade);
                      setShowGradeDropdown(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{gp.grade}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteConfirm(false);
          setLectureToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Lecture</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('[Delete] User cancelled via close button');
                  setShowDeleteConfirm(false);
                  setLectureToDelete(null);
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.deleteConfirmText}>
                Are you sure you want to delete this lecture? This action cannot be undone.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  console.log('[Delete] User cancelled deletion');
                  setShowDeleteConfirm(false);
                  setLectureToDelete(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    zIndex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  classesContainer: {
    marginBottom: 12,
  },
  classesList: {
    gap: 10,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  classInfo: {
    flex: 1,
    marginRight: 16,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B6B6B',
    letterSpacing: -0.2,
  },
  metaDot: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8A8A8A',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
    minHeight: 40,
  },
  gradeInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeInputText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
    flex: 1,
  },
  gradeInputPlaceholder: {
    color: '#9CA3AF',
  },
  autoAddButton: {
    marginTop: 12,
    backgroundColor: '#134A35',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
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
  dropdownScroll: {
    maxHeight: 400,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalSaveButton: {
    backgroundColor: '#426b1f',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteConfirmText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
