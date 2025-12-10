import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getGPAData } from '@/src/services/gpa/gpaStorageService';
import { useApp } from '@/src/context/AppContext';
import { saveGPAData } from '@/src/services/gpa/gpaStorageService';
import { PricingModal } from '@/src/components/modules/gpa/PricingModal';

interface RequirementsDetailScreenProps {
  onBack: () => void;
}

const RequirementsDetailScreen: React.FC<RequirementsDetailScreenProps> = ({ onBack }) => {
  const { userProfile, user } = useApp();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [completedCourseNames, setCompletedCourseNames] = useState<Set<string>>(new Set());
  const [completedCoreCategories, setCompletedCoreCategories] = useState<Set<string>>(new Set());
  const [gpaCourses, setGpaCourses] = useState<any[]>([]);
  const [expandedCourses, setExpandedCourses] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const userId = userProfile?.uid || user?.uid || 'guest';

  useEffect(() => {
    loadRequirementsData();
  }, [userId]);

  // Reload data when screen comes into focus (e.g., returning from GPA calculator)
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadRequirementsData();
      }
    }, [userId])
  );

  const loadRequirementsData = async () => {
    try {
      setLoading(true);
      const gpaData = await getGPAData(userId);
      
      if (gpaData?.graduationRequirementsAnalysis) {
        setAnalysis(gpaData.graduationRequirementsAnalysis);
        
        // Load GPA calculator courses
        if (gpaData.courses && Array.isArray(gpaData.courses)) {
          setGpaCourses(gpaData.courses);
        }
        
        if (gpaData.completedRequiredCourses && gpaData.completedRequiredCourses.length > 0) {
          setCompletedCourseNames(new Set(gpaData.completedRequiredCourses));
        }
        if (gpaData.completedCoreCategories && gpaData.completedCoreCategories.length > 0) {
          setCompletedCoreCategories(new Set(gpaData.completedCoreCategories));
        }
      } else {
        Alert.alert('No Analysis', 'No graduation requirements analysis found. Please upload requirements first.');
        onBack();
      }
    } catch (error: any) {
      console.error('Failed to load requirements data:', error);
      Alert.alert('Error', 'Failed to load requirements data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveChecklistState = async (completedCourses: Set<string>, completedCategories: Set<string>) => {
    if (!userId) return;
    
    try {
      const gpaData = await getGPAData(userId);
      await saveGPAData(userId, {
        ...gpaData,
        completedRequiredCourses: Array.from(completedCourses),
        completedCoreCategories: Array.from(completedCategories),
      });
    } catch (error) {
      console.error('Error saving checklist state:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Requirements Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#134A35" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Requirements Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No requirements analysis found</Text>
          <TouchableOpacity onPress={onBack} style={styles.backToGpaButton}>
            <Text style={styles.backToGpaText}>Back to GPA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const calculateCompletedCredits = () => {
    // 1. Credits from manually checked required courses
    let checkedCredits = 0;
    if (completedCourseNames.size > 0) {
      checkedCredits = analysis.requiredCourses
        ?.filter((course: any) => {
          const courseName = course.nameKorean || course.name || course;
          return completedCourseNames.has(courseName);
        })
        .reduce((sum: number, course: any) => sum + (course.credits || 3), 0) || 0;
    }
    
    // 2. Core category credits
    const coreCredits = completedCoreCategories.size * 3;
    
    // 3. Credits from GPA calculator courses
    const gpaCalculatorCredits = gpaCourses.reduce((sum, course) => {
      return sum + (course.credits || 0);
    }, 0);
    
    // 4. Credits from initial analysis (if any, but we'll use GPA calculator credits instead)
    const initialAnalysisCredits = analysis.analysis?.completedCredits || 0;
    
    // Use GPA calculator credits if available, otherwise fall back to initial analysis credits
    const courseCredits = gpaCalculatorCredits > 0 ? gpaCalculatorCredits : initialAnalysisCredits;
    
    return checkedCredits + coreCredits + courseCredits;
  };

  const calculateRemainingCredits = () => {
    const total = analysis.totalCreditsRequired || 136;
    const completed = calculateCompletedCredits();
    return Math.max(0, total - completed);
  };

  const completedRequiredCount = analysis.requiredCourses?.filter((course: any) => {
    const courseName = course.nameKorean || course.name || course;
    return completedCourseNames.has(courseName);
  }).length || 0;

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requirements Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          {/* Premium Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#134A35" />
              <Text style={styles.summaryTitle}>Requirements Analyzed</Text>
            </View>

            {/* 2x2 Grid */}
            <View style={styles.summaryGrid}>
              {analysis.totalCreditsRequired && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{analysis.totalCreditsRequired}</Text>
                  <Text style={styles.summaryLabel}>Total Credits</Text>
                </View>
              )}
              {analysis.creditBreakdown?.generalEducation?.subtotal && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{analysis.creditBreakdown.generalEducation.subtotal}</Text>
                  <Text style={styles.summaryLabel}>General Ed</Text>
                </View>
              )}
              {analysis.creditBreakdown?.major?.subtotal && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{analysis.creditBreakdown.major.subtotal}</Text>
                  <Text style={styles.summaryLabel}>Major</Text>
                </View>
              )}
              {analysis.creditBreakdown?.generalElective && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{analysis.creditBreakdown.generalElective}</Text>
                  <Text style={styles.summaryLabel}>Elective</Text>
                </View>
              )}
            </View>

            {/* Completed / Remaining */}
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Completed</Text>
                <Text style={styles.progressNumber}>{calculateCompletedCredits()}</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Remaining</Text>
                <Text style={[styles.progressNumber, styles.remainingNumber]}>
                  {calculateRemainingCredits()}
                </Text>
              </View>
            </View>
          </View>

          {/* Required Courses Section */}
          {analysis.requiredCourses && analysis.requiredCourses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  REQUIRED COURSES <Text style={styles.sectionCount}>({analysis.requiredCourses.length})</Text>
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {completedRequiredCount} / {analysis.requiredCourses.length} completed
                </Text>
              </View>
              <View style={styles.courseList}>
                {(expandedCourses ? analysis.requiredCourses : analysis.requiredCourses.slice(0, 20)).map((course: any, index: number) => {
                  const courseName = course.nameKorean || course.name || course;
                  const isCompleted = completedCourseNames.has(courseName);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.courseRow}
                      onPress={async () => {
                        const newCompleted = new Set(completedCourseNames);
                        if (isCompleted) {
                          newCompleted.delete(courseName);
                        } else {
                          newCompleted.add(courseName);
                        }
                        setCompletedCourseNames(newCompleted);
                        await saveChecklistState(newCompleted, completedCoreCategories);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.circularCheckbox, isCompleted && styles.circularCheckboxChecked]}>
                        {isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseName}>
                          {courseName}
                        </Text>
                        {course.credits && (
                          <Text style={styles.courseCredits}>{course.credits} credits</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {analysis.requiredCourses.length > 20 && (
                  <TouchableOpacity
                    onPress={() => setExpandedCourses(!expandedCourses)}
                    style={styles.viewMoreButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMoreText}>
                      {expandedCourses ? 'Show less' : `+${analysis.requiredCourses.length - 20} more`}
                    </Text>
                    <Ionicons 
                      name={expandedCourses ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#134A35" 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Core Categories Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                핵심교양 <Text style={styles.sectionCount}>({completedCoreCategories.size}/4)</Text>
              </Text>
              <Text style={styles.sectionSubtitle}>
                {completedCoreCategories.size * 3} / 12 credits
              </Text>
            </View>
            <View style={styles.categoryRow}>
              {[
                { key: '인문1', label: '인문 1' },
                { key: '인문2', label: '인문 2' },
                { key: '글로벌', label: '글로벌' },
                { key: '창의', label: '창의' },
              ].map((category) => {
                const isCompleted = completedCoreCategories.has(category.key);
                return (
                  <TouchableOpacity
                    key={category.key}
                    style={[styles.categoryPill, isCompleted && styles.categoryPillSelected]}
                    onPress={async () => {
                      const newCompleted = new Set(completedCoreCategories);
                      if (isCompleted) {
                        newCompleted.delete(category.key);
                      } else {
                        newCompleted.add(category.key);
                      }
                      setCompletedCoreCategories(newCompleted);
                      await saveChecklistState(completedCourseNames, newCompleted);
                    }}
                    activeOpacity={0.7}
                  >
                    {isCompleted && (
                      <Ionicons name="checkmark" size={14} color="#134A35" style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.categoryText, isCompleted && styles.categoryTextSelected]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Extra Features */}
          {analysis.graduationCertification?.options && analysis.graduationCertification.options.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EXTRA FEATURES</Text>
              <View style={styles.featureButtonsContainer}>
                {analysis.graduationCertification.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.featureTile}
                    activeOpacity={0.8}
                    onPress={() => setShowPricingModal(true)}
                  >
                    <View style={styles.lockIconContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#134A35" style={{ opacity: 0.4 }} />
                    </View>
                    <Text style={styles.featureTileText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Pricing Modal */}
      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  backToGpaButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#134A35',
    borderRadius: 12,
  },
  backToGpaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDEDED',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 20,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'flex-start',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -1,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B6B6B',
    letterSpacing: -0.2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F1F1',
    marginHorizontal: 16,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B6B6B',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  progressNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#134A35',
    letterSpacing: -0.5,
  },
  remainingNumber: {
    opacity: 0.65,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6A6A6A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6A6A6A',
    textTransform: 'none',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8A8A8A',
    letterSpacing: -0.1,
  },
  courseList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F1F1',
    overflow: 'hidden',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  circularCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CFCFCF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  circularCheckboxChecked: {
    backgroundColor: '#134A35',
    borderColor: '#134A35',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  courseCredits: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8A8A8A',
    letterSpacing: -0.2,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#134A35',
    letterSpacing: -0.2,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(19, 74, 53, 0.1)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
  },
  categoryTextSelected: {
    color: '#134A35',
  },
  featureButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  featureTile: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  lockIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(19, 74, 53, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureTileText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4A4A4A',
    letterSpacing: -0.3,
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default RequirementsDetailScreen;

