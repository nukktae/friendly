import EmptyState from '@/src/components/common/EmptyState';
import { AddCourseModal } from '@/src/components/gpa/AddCourseModal';
import { CourseList } from '@/src/components/gpa/CourseList';
import { CreditsRemainingCard } from '@/src/components/gpa/CreditsRemainingCard';
import { GPACard } from '@/src/components/gpa/GPACard';
import { SuggestedClassesSection } from '@/src/components/gpa/SuggestedClassesSection';
import { SyncClassesSection } from '@/src/components/gpa/SyncClassesSection';
import { GraduationRequirementsUpload } from '@/src/components/gpa/GraduationRequirementsUpload';
import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
  calculateGPA,
  getCompletedCredits,
  getCreditsRemaining,
  getProgressPercentage,
} from '@/src/services/gpa/gpaService';
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
      const data = await getGPAData(userId);
      
      if (data) {
        setGpaData(data);
        // Load graduation requirements analysis if it exists
        if (data.graduationRequirementsAnalysis) {
          setRequirementsAnalysis(data.graduationRequirementsAnalysis);
        }
      } else {
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
      console.error('Failed to load GPA data:', error);
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

  const courses = gpaData?.courses || [];
  const currentGPA = calculateGPA(courses);
  const completedCredits = getCompletedCredits(courses);
  const totalRequired = gpaData?.totalCreditsRequired || DEFAULT_TOTAL_CREDITS;
  const remainingCredits = getCreditsRemaining(totalRequired, completedCredits);
  const progressPercentage = getProgressPercentage(completedCredits, totalRequired);

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

          {courses.length > 0 && (
            <>
              <GPACard gpa={currentGPA} totalCredits={completedCredits} />

              <CreditsRemainingCard
                completedCredits={completedCredits}
                totalRequired={totalRequired}
                remainingCredits={remainingCredits}
                progressPercentage={progressPercentage}
              />
            </>
          )}

          <SyncClassesSection
            existingCourses={courses}
            onAddCourse={handleAddCourse}
          />

          {courses.length > 0 && (
            <CourseList
              courses={courses}
              onEditCourse={handleEditCourse}
              onDeleteCourse={handleDeleteCourse}
            />
          )}

          {courses.length > 0 && (
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
    paddingTop: 48,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
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

