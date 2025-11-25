import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Course } from '@/src/types/gpa.types';
import { ENV } from '@/src/config/env';
import { PricingModal } from './PricingModal';
import { saveGPAData, getGPAData } from '@/src/services/gpa/gpaStorageService';

interface GraduationRequirementsUploadProps {
  userId: string;
  completedCourses: Course[];
  analysis?: any; // Optional prop from parent to persist across remounts
  onAnalysisComplete: (analysis: any) => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  type: 'pdf' | 'image';
}

export const GraduationRequirementsUpload: React.FC<GraduationRequirementsUploadProps> = ({
  userId,
  completedCourses,
  analysis: analysisProp,
  onAnalysisComplete,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisState, setAnalysisState] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [filesBeingAnalyzed, setFilesBeingAnalyzed] = useState(0);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [completedCourseNames, setCompletedCourseNames] = useState<Set<string>>(new Set());
  const [completedCoreCategories, setCompletedCoreCategories] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isEditingGuideline, setIsEditingGuideline] = useState(false);
  const [editGuidelineText, setEditGuidelineText] = useState('');
  
  // Use prop if provided (from parent), otherwise use internal state
  const analysis = analysisProp !== undefined ? analysisProp : analysisState;

  // Shimmer animation for skeleton UI
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (analyzing) {
      // Start shimmer animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [analyzing]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Debug: Log when analysis state changes
  useEffect(() => {
    console.log('[useEffect] 🔄 Analysis state changed:', {
      hasAnalysis: !!analysis,
      analyzing,
      filesBeingAnalyzed,
      selectedFilesCount: selectedFiles.length,
      analysisType: typeof analysis,
    });
    if (analysis) {
      console.log('[useEffect] ✅ Analysis exists! Keys:', Object.keys(analysis));
      console.log('[useEffect] Analysis preview:', {
        totalCredits: analysis.totalCreditsRequired,
        hasCreditBreakdown: !!analysis.creditBreakdown,
        hasRequiredCourses: !!analysis.requiredCourses,
      });
    } else {
      console.log('[useEffect] ⚠️ No analysis - component will show upload card');
    }
  }, [analysis, analyzing, filesBeingAnalyzed, selectedFiles.length]);
  
  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log('[useEffect] 🎬 GraduationRequirementsUpload component MOUNTED');
    return () => {
      console.log('[useEffect] 🎬 GraduationRequirementsUpload component UNMOUNTED');
    };
  }, []);

  // Load checklist state from backend when analysis is available
  useEffect(() => {
    const loadChecklistState = async () => {
      if (!analysis || !userId) return;
      
      try {
        const gpaData = await getGPAData(userId);
        if (gpaData) {
          if (gpaData.completedRequiredCourses && gpaData.completedRequiredCourses.length > 0) {
            setCompletedCourseNames(new Set(gpaData.completedRequiredCourses));
          }
          if (gpaData.completedCoreCategories && gpaData.completedCoreCategories.length > 0) {
            setCompletedCoreCategories(new Set(gpaData.completedCoreCategories));
          }
        }
      } catch (error) {
        console.error('[loadChecklistState] Error loading checklist state:', error);
      }
    };

    loadChecklistState();
  }, [analysis, userId]);

  // Save checklist state to backend
  const saveChecklistState = async (completedCourses: Set<string>, completedCategories: Set<string>) => {
    if (!userId) return;
    
    try {
      const gpaData = await getGPAData(userId);
      await saveGPAData(userId, {
        ...gpaData,
        completedRequiredCourses: Array.from(completedCourses),
        completedCoreCategories: Array.from(completedCategories),
      });
      console.log('[saveChecklistState] Checklist state saved successfully');
    } catch (error) {
      console.error('[saveChecklistState] Error saving checklist state:', error);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true, // Enable multiple file selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: SelectedFile[] = result.assets.map(asset => {
          const fileName = asset.name || '';
          const mimeType = asset.mimeType || '';
        const isPDF = fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
          return {
            uri: asset.uri,
            name: fileName,
            type: isPDF ? 'pdf' : 'image',
          };
        });

        // Limit to 5 files total
        const totalFiles = selectedFiles.length + newFiles.length;
        if (totalFiles > 5) {
          const remainingSlots = 5 - selectedFiles.length;
          if (remainingSlots > 0) {
            setSelectedFiles([...selectedFiles, ...newFiles.slice(0, remainingSlots)]);
            Alert.alert('Info', `You can upload up to 5 files. Added ${remainingSlots} file(s).`);
          } else {
            Alert.alert('Limit Reached', 'You can upload up to 5 files. Please remove some files first.');
          }
        } else {
          setSelectedFiles([...selectedFiles, ...newFiles]);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick files');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const uploadAndAnalyze = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No Files', 'Please select at least one file to upload');
      return;
    }

    try {
      setFilesBeingAnalyzed(selectedFiles.length);
      setAnalyzing(true);
      setShowModal(false);

      const formData = new FormData();
      
      // Append all selected files - handle web vs native differently
      for (const file of selectedFiles) {
        const filename = file.name || file.uri.split('/').pop() || `requirements_${Date.now()}.${file.type === 'pdf' ? 'pdf' : 'jpg'}`;
        const fileType = file.type === 'pdf' ? 'application/pdf' : 'image/jpeg';

        if (Platform.OS === 'web') {
          // On web, fetch the file and convert to Blob/File
          try {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileObj = new File([blob], filename, { type: fileType });
            formData.append('files', fileObj);
          } catch (error) {
            console.error('Error converting file to blob:', error);
            throw new Error(`Failed to process file: ${filename}`);
          }
        } else {
          // React Native - use uri format
          formData.append('files', {
            uri: file.uri,
        name: filename,
        type: fileType,
      } as any);
        }
      }

      formData.append('completedCourses', JSON.stringify(completedCourses));

      console.log('[uploadAndAnalyze] 🚀 Starting upload and analyze...');
      console.log('[uploadAndAnalyze] URL:', `${ENV.API_BASE || 'http://localhost:4000'}/api/gpa/${userId}/requirements/analyze`);
      console.log('[uploadAndAnalyze] Files to upload:', selectedFiles.length);
      console.log('[uploadAndAnalyze] FormData entries:', Array.from(formData.entries()).map(([key, value]) => ({ key, valueType: typeof value })));

      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/gpa/${userId}/requirements/analyze`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser/runtime set it with boundary
      });

      console.log('[uploadAndAnalyze] 📡 Response received');
      console.log('[uploadAndAnalyze] Response status:', response.status, response.statusText);
      console.log('[uploadAndAnalyze] Response ok:', response.ok);
      console.log('[uploadAndAnalyze] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.json();
        console.error('[uploadAndAnalyze] Error response:', error);
        throw new Error(error.error || 'Failed to analyze requirements');
      }

      const responseText = await response.text();
      console.log('[uploadAndAnalyze] 📦 Raw response text:', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('[uploadAndAnalyze] ✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('[uploadAndAnalyze] ❌ Failed to parse JSON:', parseError);
        console.error('[uploadAndAnalyze] Full response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('[uploadAndAnalyze] 📦 Parsed response:', data);
      console.log('[uploadAndAnalyze] Response keys:', Object.keys(data));
      console.log('[uploadAndAnalyze] data.success:', data.success);
      console.log('[uploadAndAnalyze] data.analysis:', data.analysis);
      console.log('[uploadAndAnalyze] data.analysis type:', typeof data.analysis);
      console.log('[uploadAndAnalyze] data.analysis truthy?', !!data.analysis);
      console.log('[uploadAndAnalyze] data.analysis keys:', data.analysis ? Object.keys(data.analysis) : 'null');
      
      // Check for analysis - backend sends { success: true, analysis: {...} }
      const analysisData = data.analysis;
      
      if (!analysisData) {
        console.error('[uploadAndAnalyze] ❌ No analysis in response');
        console.error('[uploadAndAnalyze] Response structure:', {
          hasSuccess: 'success' in data,
          success: data.success,
          hasAnalysis: 'analysis' in data,
          keys: Object.keys(data),
        });
        console.error('[uploadAndAnalyze] Full response:', JSON.stringify(data, null, 2));
        setAnalyzing(false);
        setFilesBeingAnalyzed(0);
        throw new Error('Invalid response: missing analysis data');
      }
      
      console.log('[uploadAndAnalyze] ✅ Analysis received, setting state...');
      console.log('[uploadAndAnalyze] Analysis preview:', {
        totalCredits: analysisData.totalCreditsRequired,
        coursesCount: analysisData.requiredCourses?.length,
        hasCreditBreakdown: !!analysisData.creditBreakdown,
        keys: Object.keys(analysisData),
      });
      
      // Set all states together - React will batch these updates
      // IMPORTANT: Set analysis BEFORE clearing analyzing to ensure smooth transition
      console.log('[uploadAndAnalyze] 🔄 Setting analysis state...');
      console.log('[uploadAndAnalyze] Analysis data to set:', {
        totalCredits: analysisData.totalCreditsRequired,
        hasCreditBreakdown: !!analysisData.creditBreakdown,
        hasRequiredCourses: !!analysisData.requiredCourses,
        keys: Object.keys(analysisData),
      });
      
      // Set analysis state (only if not controlled by parent prop)
      if (analysisProp === undefined) {
        setAnalysisState(analysisData);
        console.log('[uploadAndAnalyze] ✅ setAnalysisState() called (internal state)');
      } else {
        console.log('[uploadAndAnalyze] ✅ Analysis controlled by parent prop, skipping internal state');
      }
      
      // Clear loading states
      console.log('[uploadAndAnalyze] 🔄 Clearing loading states...');
      setAnalyzing(false);
      setFilesBeingAnalyzed(0);
      setSelectedFiles([]);
      console.log('[uploadAndAnalyze] ✅ Loading states cleared');
      
      // Call callback
      console.log('[uploadAndAnalyze] 🔄 Calling onAnalysisComplete callback...');
      try {
        onAnalysisComplete(analysisData);
        console.log('[uploadAndAnalyze] ✅ onAnalysisComplete callback executed');
      } catch (callbackError) {
        console.error('[uploadAndAnalyze] ❌ Error in onAnalysisComplete callback:', callbackError);
      }
      
      console.log('[uploadAndAnalyze] ✅✅✅ All states updated - component should re-render with analysis card NOW');
    } catch (error: any) {
      console.error('[uploadAndAnalyze] Error caught:', error);
      Alert.alert('Error', error.message || 'Failed to analyze requirements');
      setFilesBeingAnalyzed(0);
      setAnalyzing(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter graduation requirements text');
      return;
    }

    try {
      setAnalyzing(true);
      setShowModal(false);

      const response = await fetch(`${ENV.API_BASE || 'http://localhost:4000'}/api/gpa/${userId}/requirements/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textInput,
          completedCourses,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze requirements');
      }

      const data = await response.json();
      if (analysisProp === undefined) {
        setAnalysisState(data.analysis);
      }
      onAnalysisComplete(data.analysis);
      setTextInput('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze requirements');
    } finally {
      setAnalyzing(false);
    }
  };

  // Debug render decisions
  console.log('[Render] Component render:', {
    analyzing,
    hasAnalysis: !!analysis,
    analysisType: typeof analysis,
    analysisKeys: analysis ? Object.keys(analysis) : 'null',
    filesBeingAnalyzed,
    selectedFilesCount: selectedFiles.length,
  });

  if (analyzing) {
    console.log('[Render] 🔄 Showing skeleton loading');
    return (
      <View style={styles.container}>
        <View style={styles.analysisCard}>
          {/* Header Skeleton */}
          <View style={styles.analysisHeader}>
            <View style={styles.analysisHeaderLeft}>
              <Animated.View style={[styles.skeletonIcon, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonTitle, { opacity: shimmerOpacity }]} />
            </View>
            <Animated.View style={[styles.skeletonClose, { opacity: shimmerOpacity }]} />
          </View>

          {/* Summary Grid Skeleton */}
          <View style={styles.summaryGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.summaryItem}>
                <Animated.View style={[styles.skeletonNumber, { opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.skeletonLabel, { opacity: shimmerOpacity }]} />
              </View>
            ))}
          </View>

          {/* Progress Bar Skeleton */}
          <View style={styles.progressBar}>
            <View style={styles.progressItem}>
              <Animated.View style={[styles.skeletonProgressLabel, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonProgressValue, { opacity: shimmerOpacity }]} />
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Animated.View style={[styles.skeletonProgressLabel, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonProgressValue, { opacity: shimmerOpacity }]} />
            </View>
          </View>

          {/* Info Rows Skeleton */}
          <View style={styles.infoRow}>
            <Animated.View style={[styles.skeletonInfoLabel, { opacity: shimmerOpacity }]} />
            <View style={styles.badgesContainer}>
              {[1, 2, 3].map((i) => (
                <Animated.View key={i} style={[styles.skeletonBadge, { opacity: shimmerOpacity }]} />
              ))}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Animated.View style={[styles.skeletonInfoLabel, { opacity: shimmerOpacity }]} />
            <View style={styles.badgesContainer}>
              {[1, 2].map((i) => (
                <Animated.View key={i} style={[styles.skeletonBadgeAlt, { opacity: shimmerOpacity }]} />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (analysis) {
    console.log('[Render] ✅ Analysis exists, showing analysis card');
    console.log('[Render] Analysis keys:', Object.keys(analysis));
    console.log('[Render] Analysis preview:', {
      totalCredits: analysis.totalCreditsRequired,
      hasCreditBreakdown: !!analysis.creditBreakdown,
      hasRequiredCourses: !!analysis.requiredCourses,
    });

    return (
      <View style={styles.container}>
        <View style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <View style={styles.analysisHeaderLeft}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={14} color="#10b981" />
              </View>
            <Text style={styles.analysisTitle}>Requirements Analyzed</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  setIsEditingGuideline(true);
                  setEditGuidelineText(JSON.stringify(analysis, null, 2));
                }}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={16} color="#6366F1" />
              </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                console.log('[Render] Close button pressed, clearing analysis');
                if (analysisProp === undefined) {
                  setAnalysisState(null);
                }
                onAnalysisComplete(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summaryGrid}>
          {analysis.totalCreditsRequired && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{analysis.totalCreditsRequired}</Text>
                <Text style={styles.summaryText}>Total Credits</Text>
            </View>
          )}
            {analysis.creditBreakdown?.generalEducation?.subtotal && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{analysis.creditBreakdown.generalEducation.subtotal}</Text>
                <Text style={styles.summaryText}>General Ed</Text>
                </View>
              )}
            {analysis.creditBreakdown?.major?.subtotal && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{analysis.creditBreakdown.major.subtotal}</Text>
                <Text style={styles.summaryText}>Major</Text>
                </View>
              )}
            {analysis.creditBreakdown?.generalElective && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{analysis.creditBreakdown.generalElective}</Text>
                <Text style={styles.summaryText}>Elective</Text>
              </View>
          )}
          </View>

          {analysis.analysis && (analysis.analysis.completedCredits !== undefined || analysis.analysis.remainingCredits !== undefined) && (
            <View style={styles.progressBar}>
              <View style={styles.progressItem}>
                <Text style={styles.progressText}>Completed</Text>
                <Text style={styles.progressNumber}>
                  {(() => {
                    // Calculate completed credits from checked courses
                    let checkedCredits = 0;
                    if (completedCourseNames.size > 0) {
                      checkedCredits = analysis.requiredCourses
                        ?.filter((course: any) => {
                          const courseName = course.nameKorean || course.name || course;
                          return completedCourseNames.has(courseName);
                        })
                        .reduce((sum: number, course: any) => sum + (course.credits || 3), 0) || 0;
                    }
                    // Add core category credits (3 credits per completed category)
                    const coreCredits = completedCoreCategories.size * 3;
                    return checkedCredits + coreCredits + (analysis.analysis.completedCredits || 0);
                  })()}
                </Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressText}>Remaining</Text>
                <Text style={[styles.progressNumber, styles.remainingNumber]}>
                  {(() => {
                    const total = analysis.totalCreditsRequired || 136;
                    let checkedCredits = 0;
                    if (completedCourseNames.size > 0) {
                      checkedCredits = analysis.requiredCourses
                        ?.filter((course: any) => {
                          const courseName = course.nameKorean || course.name || course;
                          return completedCourseNames.has(courseName);
                        })
                        .reduce((sum: number, course: any) => sum + (course.credits || 3), 0) || 0;
                    }
                    // Add core category credits (3 credits per completed category)
                    const coreCredits = completedCoreCategories.size * 3;
                    const completed = checkedCredits + coreCredits + (analysis.analysis.completedCredits || 0);
                    return Math.max(0, total - completed);
                  })()}
                </Text>
              </View>
            </View>
          )}

          {analysis.requiredCourses && analysis.requiredCourses.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <Text style={styles.compactSectionTitle}>
                  Required Courses <Text style={styles.compactSectionCount}>({analysis.requiredCourses.length})</Text>
                </Text>
              </View>
              <View style={styles.compactChecklist}>
                {(expandedCourses ? analysis.requiredCourses : analysis.requiredCourses.slice(0, 6)).map((course: any, index: number) => {
                  const courseName = course.nameKorean || course.name || course;
                  const isCompleted = completedCourseNames.has(courseName);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.compactChecklistItem}
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
                    >
                      <View style={[styles.compactCheckbox, isCompleted && styles.compactCheckboxChecked]}>
                      </View>
                      <Text 
                        style={[styles.compactChecklistText, isCompleted && styles.compactChecklistTextCompleted]}
                        numberOfLines={1}
                      >
                        {courseName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {analysis.requiredCourses.length > 6 && (
                  <TouchableOpacity
                    onPress={() => setExpandedCourses(!expandedCourses)}
                    style={styles.compactViewMore}
                  >
                    <Text style={styles.compactViewMoreText}>
                      {expandedCourses ? 'Show less' : `+${analysis.requiredCourses.length - 6} more`}
                    </Text>
                    <Ionicons 
                      name={expandedCourses ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color="#426b1f" 
                    />
                  </TouchableOpacity>
              )}
              </View>
            </View>
          )}

          {/* 핵심교양 (Core General Education) Section */}
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <Text style={styles.compactSectionTitle}>
                핵심교양 <Text style={styles.compactSectionCount}>({completedCoreCategories.size}/4)</Text>
              </Text>
              <Text style={styles.compactSectionSubtitle}>
                {completedCoreCategories.size * 3} / 12 credits
              </Text>
            </View>
            <View style={styles.compactCategoryRow}>
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
                    style={styles.compactCategoryItem}
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
                  >
                    <View style={[styles.compactCheckbox, isCompleted && styles.compactCheckboxChecked]}>
                    </View>
                    <Text 
                      style={[styles.compactCategoryText, isCompleted && styles.compactChecklistTextCompleted]}
                      numberOfLines={1}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {analysis.graduationCertification?.options && analysis.graduationCertification.options.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.featureRow}>
                <Text style={styles.compactSectionTitle}>Extra Features</Text>
                <View style={styles.featureButtonsContainer}>
                  {analysis.graduationCertification.options.map((option: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setShowPricingModal(true)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#9333EA', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.featureButton}
                      >
                        <Text style={styles.featureButtonText}>{option}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Courses Modal */}
        <Modal
          visible={showCoursesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCoursesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.coursesModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Required Courses</Text>
                <TouchableOpacity
                  onPress={() => setShowCoursesModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalCoursesList}>
                {analysis.requiredCourses?.map((course: any, index: number) => {
                  const courseName = course.nameKorean || course.name || course;
                  const isCompleted = completedCourseNames.has(courseName);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.modalChecklistItem}
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
                    >
                      <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                      </View>
                      <View style={styles.modalCourseInfo}>
                        <Text style={[styles.modalChecklistText, isCompleted && styles.checklistTextCompleted]}>
                          {courseName}
                        </Text>
                        {course.credits && (
                          <Text style={styles.modalCourseCredits}>{course.credits} credits</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Pricing Modal */}
        <PricingModal
          visible={showPricingModal}
          onClose={() => setShowPricingModal(false)}
        />

        {/* Edit Guideline Modal */}
        <Modal
          visible={isEditingGuideline}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setIsEditingGuideline(false);
            setEditGuidelineText('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Guidelines</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingGuideline(false);
                    setEditGuidelineText('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <View style={styles.editModalBody}>
                <TextInput
                  style={styles.editGuidelineInput}
                  multiline
                  numberOfLines={20}
                  value={editGuidelineText}
                  onChangeText={setEditGuidelineText}
                  placeholder="Edit guideline data..."
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.editModalFooter}>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingGuideline(false);
                    setEditGuidelineText('');
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const parsedData = JSON.parse(editGuidelineText);
                      if (analysisProp === undefined) {
                        setAnalysisState(parsedData);
                      }
                      onAnalysisComplete(parsedData);
                      setIsEditingGuideline(false);
                      setEditGuidelineText('');
                    } catch (error) {
                      Alert.alert('Error', 'Invalid JSON format. Please check your input.');
                    }
                  }}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  console.log('[Render] 📤 Showing upload card (no analysis, not analyzing)');
  return (
    <View style={styles.container}>
      <View style={styles.uploadCard}>
        {selectedFiles.length === 0 && (
          <>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text" size={24} color="#426b1f" />
          </View>
        </View>
        
        <Text style={styles.uploadTitle}>Graduation Requirements</Text>
        <Text style={styles.uploadSubtitle}>
              Upload up to 5 files (PDF or images) for analysis
        </Text>
          </>
        )}

        {selectedFiles.length > 0 && (
          <View style={styles.filesList}>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Ionicons 
                  name={file.type === 'pdf' ? 'document-text' : 'image'} 
                  size={16} 
                  color="#426b1f" 
                />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name || `File ${index + 1}`}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFile(index)}
                  style={styles.removeFileButton}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedFiles.length < 5 && (
              <Text style={styles.fileCountText}>
                {selectedFiles.length} / 5 files selected
              </Text>
            )}
          </View>
        )}

        {selectedFiles.length > 0 ? (
          <View style={styles.buttonContainerWithFiles}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={uploadAndAnalyze}
              activeOpacity={0.8}
            >
              <Ionicons name="analytics-outline" size={18} color="#FFFFFF" style={styles.analyzeButtonIcon} />
              <Text style={styles.analyzeButtonText}>Analyze {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}</Text>
            </TouchableOpacity>
            
            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButtonSmall,
                  selectedFiles.length >= 5 && styles.secondaryButtonDisabled
                ]}
                onPress={handlePickFile}
                activeOpacity={0.7}
                disabled={selectedFiles.length >= 5}
              >
                <Ionicons name="add-circle-outline" size={18} color={selectedFiles.length >= 5 ? "#9CA3AF" : "#426b1f"} />
                <Text style={[styles.secondaryButtonTextSmall, selectedFiles.length >= 5 && styles.secondaryButtonTextDisabled]}>
                  Add More
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButtonSmall}
                onPress={() => setShowModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color="#426b1f" />
                <Text style={styles.secondaryButtonTextSmall}>Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePickFile}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Upload Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#426b1f" />
            <Text style={styles.secondaryButtonText}>Type Manually</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>

      {/* Text Input Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Requirements</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Paste your graduation requirements here..."
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={10}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAnalyzeButton]}
                onPress={handleAnalyzeText}
              >
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    marginBottom: 20,
  },
  uploadCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(66, 107, 31, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  filesList: {
    width: '100%',
    marginBottom: 16,
    maxHeight: 150,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  removeFileButton: {
    padding: 2,
  },
  fileCountText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  buttonContainerWithFiles: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#426b1f',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: '#426b1f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  analyzeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#426b1f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#426b1f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  analyzeButtonIcon: {
    marginRight: 8,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(66, 107, 31, 0.3)',
  },
  secondaryButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(66, 107, 31, 0.3)',
  },
  secondaryButtonDisabled: {
    borderColor: 'rgba(156, 163, 175, 0.3)',
    opacity: 0.5,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#426b1f',
    letterSpacing: -0.2,
  },
  secondaryButtonTextSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: '#426b1f',
    letterSpacing: -0.2,
  },
  secondaryButtonTextDisabled: {
    color: '#9CA3AF',
  },
  // Skeleton UI Styles
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  skeletonTitle: {
    width: 140,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  skeletonClose: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  skeletonNumber: {
    width: 40,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 6,
  },
  skeletonLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  skeletonProgressLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 6,
  },
  skeletonProgressValue: {
    width: 40,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  skeletonInfoLabel: {
    width: 100,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  skeletonBadgeAlt: {
    width: 70,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analysisHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  successIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  remainingNumber: {
    color: '#DC2626',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  badgeAlt: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTextAlt: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  badgeMore: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    alignSelf: 'center',
    paddingVertical: 4,
  },
  infoRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 11,
    color: '#426b1f',
    fontWeight: '600',
  },
  coursesChecklist: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#426b1f',
    borderColor: '#426b1f',
  },
  checklistText: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  checklistTextCompleted: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  viewMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 12,
    color: '#426b1f',
    fontWeight: '600',
  },
  coursesModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalCoursesList: {
    maxHeight: 500,
  },
  modalChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCourseInfo: {
    flex: 1,
  },
  modalChecklistText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  modalCourseCredits: {
    fontSize: 12,
    color: '#6B7280',
  },
  coreSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  coreCategoriesList: {
    gap: 8,
    marginTop: 8,
  },
  coreCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  coreCategoryInfo: {
    flex: 1,
  },
  coreCategoryLabel: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 2,
  },
  coreCategoryCredits: {
    fontSize: 11,
    color: '#6B7280',
  },
  coreProgress: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coreProgressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  coreProgressCredits: {
    fontSize: 12,
    color: '#426b1f',
    fontWeight: '600',
  },
  // Compact Section Styles
  compactSection: {
    marginBottom: 16,
  },
  compactSectionHeader: {
    marginBottom: 10,
  },
  compactSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactSectionBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  compactSectionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  compactSectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  compactChecklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    width: '31%',
    minWidth: 0,
  },
  compactCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  compactCheckboxChecked: {
    backgroundColor: '#426b1f',
    borderColor: '#426b1f',
  },
  compactChecklistText: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
    fontWeight: '500',
  },
  compactChecklistTextCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  compactViewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 2,
  },
  compactViewMoreText: {
    fontSize: 11,
    color: '#426b1f',
    fontWeight: '600',
  },
  compactCategoryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  compactCategoryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    minWidth: 0,
  },
  compactCategoryText: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  featureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 60,
  },
  featureButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  courseItem: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionItem: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  moreText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  reanalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 6,
  },
  reanalyzeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#426b1f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalAnalyzeButton: {
    backgroundColor: '#426b1f',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  editModalBody: {
    marginBottom: 16,
  },
  editGuidelineInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 300,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  editModalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
});

