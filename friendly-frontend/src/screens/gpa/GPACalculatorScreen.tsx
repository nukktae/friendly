import EmptyState from '@/src/components/common/EmptyState';
import { AddCourseModal } from '@/src/components/gpa/AddCourseModal';
import { AddSemesterModal } from '@/src/components/gpa/AddSemesterModal';
import { CourseList } from '@/src/components/gpa/CourseList';
import { SuggestedClassesSection } from '@/src/components/gpa/SuggestedClassesSection';
import { SyncClassesSection } from '@/src/components/gpa/SyncClassesSection';
import { GraduationRequirementsUpload } from '@/src/components/gpa/GraduationRequirementsUpload';
import { SemesterSelector } from '@/src/components/gpa/SemesterSelector';
import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useMemo } from 'react';
import { getCurrentSemester, isCurrentOrFutureSemester } from '@/src/utils/semesterUtils';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Course, GPAData, SuggestedClass } from '@/src/types/gpa.types';
import {
  addCourse,
  deleteCourse,
  getGPAData,
  saveGPAData,
  updateCourse,
} from '@/src/services/gpa/gpaStorageService';
import { ENV } from '@/src/config/env';

const DEFAULT_TOTAL_CREDITS = 120;

const GPACalculatorScreen: React.FC = () => {
  const { userProfile, user } = useApp();
  const [gpaData, setGpaData] = useState<GPAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedClass[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsInput, setCreditsInput] = useState('');
  const [requirementsAnalysis, setRequirementsAnalysis] = useState<any>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>(getCurrentSemester());
  const [showAddSemesterModal, setShowAddSemesterModal] = useState(false);

  const userId = userProfile?.uid || user?.uid || 'guest';

  useEffect(() => {
    loadGPAData();
  }, [userId]);

  useEffect(() => {
    if (gpaData && gpaData.courses.length > 0) {
      loadSuggestions();
    }
  }, [gpaData?.courses.length]);

  const loadGPAData = async () => {
    try {
      setLoading(true);
      console.log('[GPACalculatorScreen] loadGPAData called');
      const data = await getGPAData(userId);
      
      if (data) {
        console.log('[GPACalculatorScreen] GPA data loaded:', {
          coursesCount: data.courses?.length || 0,
          courses: data.courses?.map(c => ({ id: c.id, name: c.name, credits: c.credits })) || [],
          hasAnalysis: !!data.graduationRequirementsAnalysis
        });
        setGpaData(data);
        // Load graduation requirements analysis if it exists
        if (data.graduationRequirementsAnalysis) {
          setRequirementsAnalysis(data.graduationRequirementsAnalysis);
        }
      } else {
        console.log('[GPACalculatorScreen] No GPA data, initializing...');
        // Initialize with default values
        setGpaData({
          userId,
          courses: [],
          totalCreditsRequired: DEFAULT_TOTAL_CREDITS,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error: any) {
      console.error('[GPACalculatorScreen] Failed to load GPA data:', error);
      Alert.alert('Error', 'Failed to load GPA data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!gpaData || gpaData.courses.length === 0) return;

    try {
      setLoadingSuggestions(true);
      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/gpa/${userId}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedCourses: gpaData.courses,
          totalCreditsRequired: gpaData.totalCreditsRequired,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCourse: Course = {
        ...courseData,
        id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addCourse(userId, newCourse);
      await loadGPAData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add course');
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setShowAddModal(true);
  };

  const handleUpdateCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingCourse) return;

    try {
      await updateCourse(userId, editingCourse.id, courseData);
      await loadGPAData();
      setEditingCourse(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update course');
    }
  };

  const handleUpdateCourseInline = async (courseId: string, updates: { credits?: number; grade?: string }) => {
    try {
      console.log('[GPACalculatorScreen] handleUpdateCourseInline called:', { courseId, updates });
      const course = courses.find(c => c.id === courseId);
      if (!course) {
        console.log('[GPACalculatorScreen] Course not found:', courseId);
        return;
      }

      console.log('[GPACalculatorScreen] Updating course:', course.name, 'from', course.credits, 'to', updates.credits);
      await updateCourse(userId, courseId, {
        ...course,
        ...updates,
      });
      console.log('[GPACalculatorScreen] Course updated, reloading GPA data...');
      await loadGPAData();
      console.log('[GPACalculatorScreen] GPA data reloaded');
    } catch (error: any) {
      console.error('[GPACalculatorScreen] Error updating course:', error);
      Alert.alert('Error', error.message || 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourse(userId, courseId);
              await loadGPAData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  const handleSaveCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCourse) {
      await handleUpdateCourse(courseData);
    } else {
      await handleAddCourse(courseData);
    }
    setShowAddModal(false);
    setEditingCourse(null);
  };

  const handleAddManualSuggestion = async (name: string, credits: number) => {
    const newSuggestion: SuggestedClass = {
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      credits,
      reason: 'Manually added',
      isAI: false,
      createdAt: new Date(),
    };

    setSuggestions([...suggestions, newSuggestion]);
  };

  const handleRemoveSuggestion = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
  };

  const handleSetTotalCredits = () => {
    setCreditsInput(gpaData?.totalCreditsRequired.toString() || '120');
    setShowCreditsModal(true);
  };

  const handleSaveTotalCredits = async () => {
    const totalCredits = parseInt(creditsInput);
    if (isNaN(totalCredits) || totalCredits <= 0) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    try {
      await saveGPAData(userId, {
        ...gpaData!,
        totalCreditsRequired: totalCredits,
      });
      await loadGPAData();
      setShowCreditsModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update total credits');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGPAData();
    await loadSuggestions();
    setRefreshing(false);
  };

  // Calculate these values BEFORE any early returns to ensure hooks are always called
  const courses = gpaData?.courses || [];
  const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const componentKey = `requirements-${courses.length}-${totalCredits}`;
  
  // Get available semesters from courses (must be BEFORE any early returns)
  const availableSemesters = useMemo(() => {
    const semesters = new Set<string>();
    courses.forEach(course => {
      if (course.semester) {
        semesters.add(course.semester);
      }
    });
    return Array.from(semesters);
  }, [courses]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>GPA Calculator</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }
  
  console.log('[GPACalculatorScreen] RENDER - courses:', courses.length, 'totalCredits:', totalCredits);
  console.log('[GPACalculatorScreen] RENDER - componentKey:', componentKey);
  console.log('[GPACalculatorScreen] RENDER - courses details:', courses.map(c => ({ id: c.id, name: c.name, credits: c.credits })));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GPA Calculator</Text>
        <TouchableOpacity
          onPress={handleSetTotalCredits}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.scrollContent}>
          <GraduationRequirementsUpload
            key={componentKey}
            userId={userId}
            completedCourses={courses}
            analysis={requirementsAnalysis}
            onAnalysisComplete={async (analysis) => {
              console.log('[GPACalculatorScreen] onAnalysisComplete called with:', {
                hasAnalysis: !!analysis,
                totalCredits: analysis?.totalCreditsRequired,
              });
              
              // Store analysis in parent state FIRST to persist across remounts
              setRequirementsAnalysis(analysis);
              
              if (analysis) {
                // Save analysis to backend along with total credits
                const updatedGpaData = {
                  ...gpaData,
                  graduationRequirementsAnalysis: analysis,
                  totalCreditsRequired: analysis.totalCreditsRequired || gpaData?.totalCreditsRequired || DEFAULT_TOTAL_CREDITS,
                };
                
                console.log('[GPACalculatorScreen] Saving analysis to backend...');
                await saveGPAData(userId, updatedGpaData);
                console.log('[GPACalculatorScreen] Analysis saved successfully');
                
                // Update local state
                setGpaData(updatedGpaData);
              } else {
                // Clear analysis from backend
                if (gpaData) {
                  await saveGPAData(userId, {
                    ...gpaData,
                    graduationRequirementsAnalysis: null,
                  });
                }
                setRequirementsAnalysis(null);
              }
            }}
          />

          {/* Only show SyncClassesSection for current or future semesters */}
          {isCurrentOrFutureSemester(selectedSemester) && (
            <SyncClassesSection
              existingCourses={courses}
              onAddCourse={handleAddCourse}
            />
          )}

          {courses.length > 0 && (
            <>
              <SemesterSelector
                selectedSemester={selectedSemester}
                onSemesterSelect={setSelectedSemester}
                onAddNewSemester={() => setShowAddSemesterModal(true)}
                availableSemesters={availableSemesters}
              />
              <CourseList
                courses={courses}
                selectedSemester={selectedSemester}
                onUpdateCourse={handleUpdateCourseInline}
                onDeleteCourse={handleDeleteCourse}
              />
            </>
          )}

          {/* Only show SuggestedClassesSection for current or future semesters */}
          {courses.length > 0 && isCurrentOrFutureSemester(selectedSemester) && (
            <SuggestedClassesSection
              suggestions={suggestions}
              loading={loadingSuggestions}
              onAddManual={handleAddManualSuggestion}
              onRemove={handleRemoveSuggestion}
              onRefresh={loadSuggestions}
            />
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      <AddCourseModal
        visible={showAddModal}
        course={editingCourse}
        onClose={() => {
          setShowAddModal(false);
          setEditingCourse(null);
        }}
        onSave={handleSaveCourse}
      />

      <AddSemesterModal
        visible={showAddSemesterModal}
        existingSemesters={availableSemesters}
        onClose={() => setShowAddSemesterModal(false)}
        onSave={(semester) => {
          setSelectedSemester(semester);
          setShowAddSemesterModal(false);
        }}
      />

      {/* Credits Modal */}
      <Modal
        visible={showCreditsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreditsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Total Credits Required</Text>
            <Text style={styles.modalSubtitle}>
              Enter the total number of credits required for graduation:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="120"
              value={creditsInput}
              onChangeText={setCreditsInput}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowCreditsModal(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTotalCredits}
                style={[styles.modalButton, styles.modalSaveButton]}
              >
                <Text style={styles.modalSaveText}>Save</Text>
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
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  settingsButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  bottomSpacing: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalSaveButton: {
    backgroundColor: '#426b1f',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default GPACalculatorScreen;

