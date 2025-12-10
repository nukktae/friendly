import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '@/src/context/AppContext';
import {
  ClassAssignmentsSection,
  ClassExamsSection,
  ClassFilesSection,
  ClassRecordingsSection,
} from '@/src/components/modules/classes';
import {
  fetchClassAssignments,
  fetchClassExams,
  fetchClassFiles,
  fetchClassRecordings,
  updateAssignment,
} from '@/src/services/classes/classResourcesService';
import { ClassAssignment, ClassExam, ClassFile, ClassRecording } from '@/src/types';
import { PDFViewer } from '@/src/components/modules/pdf/PDFViewer';
import { getPDF, uploadPDF } from '@/src/services/pdf/pdfService';
import { PDFFile } from '@/src/services/pdf/pdfService';

interface ClassDetailScreenProps {
  id: string;
  title: string;
  time: string;
  type: string;
  location?: string;
  instructor?: string;
  color?: string;
}

type TabKey = 'files' | 'recordings' | 'assignments' | 'exams';

export default function ClassDetailScreen({
  id,
  title,
  time,
  type,
  location,
  instructor,
  color,
}: ClassDetailScreenProps) {
  const router = useRouter();
  
  const handleBack = () => {
    // Try to go back, if that fails navigate to explore tab
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/explore');
      }
    } catch (error) {
      // Fallback to explore tab if navigation fails
      router.push('/(tabs)/explore');
    }
  };

  const handleRecordPress = () => {
    router.push({
      pathname: '/record',
      params: { lectureId: id }
    });
  };
  const { user } = useApp();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<TabKey>('files');
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [exams, setExams] = useState<ClassExam[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<PDFFile | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadResources = useCallback(async () => {
    if (!id) return;

    setIsLoadingResources(true);
    setResourcesError(null);

    try {
      const userId = user?.uid;
      
      // Fetch files and assignments (userId optional)
      const [filesData, assignmentsData] = await Promise.all([
        fetchClassFiles(id, userId),
        fetchClassAssignments(id, userId),
      ]);

      // Only fetch recordings and exams if userId is available (required for these endpoints)
      let recordingsData: ClassRecording[] = [];
      let examsData: ClassExam[] = [];
      if (userId) {
        try {
          [recordingsData, examsData] = await Promise.all([
            fetchClassRecordings(id, userId),
            fetchClassExams(id, userId),
          ]);
        } catch (error) {
          console.warn('Failed to fetch recordings/exams:', error);
          // Continue with empty arrays
        }
      }

      if (!isMountedRef.current) return;

      setFiles(filesData);
      setRecordings(recordingsData);
      setAssignments(assignmentsData);
      setExams(examsData);
      setResourcesError(null); // Clear any previous errors
    } catch (error) {
      if (!isMountedRef.current) return;

      // Only show error if it's not a 404 (endpoint doesn't exist)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load class resources';
      if (!errorMessage.includes('Cannot GET') && !errorMessage.includes('404')) {
        setResourcesError(errorMessage);
      } else {
        // Endpoint doesn't exist yet, silently fail
        setResourcesError(null);
      }
    } finally {
      if (!isMountedRef.current) return;
      setIsLoadingResources(false);
    }
  }, [id, user?.uid]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleStatusUpdate = useCallback(async (
    assignmentId: string,
    classId: string,
    status: ClassAssignment['status']
  ) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to update assignment status');
      return;
    }

    try {
      await updateAssignment(assignmentId, classId, user.uid, { 
        status: status as 'not_started' | 'in_progress' | 'completed' 
      });
      // Refresh assignments after update
      await loadResources();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update assignment status');
    }
  }, [user?.uid, loadResources]);

  const handleAddPDF = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upload PDFs');
      return;
    }

    try {
      // Open system file picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // User cancelled
      }

      const file = result.assets[0];

      // Validate file size (50MB limit)
      if (file.size && file.size > 50 * 1024 * 1024) {
        Alert.alert('Error', 'File size exceeds 50MB limit');
        return;
      }

      setIsUploadingPDF(true);

      // Upload PDF directly
      await uploadPDF(file.uri, user.uid, {
        title: file.name.replace(/\.pdf$/i, ''),
        classId: id,
      });

      // Reload resources to show the new file
      await loadResources();

      Alert.alert('Success', 'PDF uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      
      let errorMessage = error.message || 'Failed to upload PDF';
      
      // Provide more helpful messages for specific error types
      if (errorMessage.includes('bucket') || errorMessage.includes('Storage')) {
        errorMessage = `Storage Error\n\n${errorMessage}`;
      } else if (errorMessage.includes('Permission denied') || errorMessage.includes('403')) {
        errorMessage = `Permission Denied\n\n${errorMessage}`;
      } else if (errorMessage.includes('does not exist') || errorMessage.includes('404')) {
        errorMessage = `Storage Not Found\n\n${errorMessage}`;
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsUploadingPDF(false);
    }
  }, [user?.uid, id, loadResources]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'files', label: `Files (${files.length})` },
    { key: 'recordings', label: `Recordings (${recordings.length})` },
    { key: 'assignments', label: `Assignments (${assignments.length})` },
    { key: 'exams', label: `Exams (${exams.length})` },
  ];


  // Get class color tint based on class type/color
  const getClassColorTint = (classColor?: string): string => {
    // Map class colors to tint backgrounds
    const colorMap: Record<string, string> = {
      '#2B59D1': '#E6EEF9', // Blue
      '#9A3CA5': '#F4E9F8', // Purple
      '#C33A3A': '#F9E6E6', // Red
      '#CD6A28': '#FCEFE5', // Orange
      '#D93A73': '#FCE7F0', // Pink
      '#167A7A': '#E4F2F2', // Teal
      '#2C6E42': '#E6F4EA', // Mint Green
      '#5A3EC8': '#ECE9FA', // Indigo
      '#D4A11F': '#FFF6D7', // Yellow
      '#1F5D43': '#E7F2ED', // Emerald
    };
    return colorMap[classColor || ''] || '#E8F3EB'; // Default green tint
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.topHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={handleBack} style={styles.topBackButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle} numberOfLines={1}>{title}</Text>
      </Animated.View>


      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0D1A0D" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <View style={[styles.classBadge, { backgroundColor: color ? getClassColorTint(color) : '#E8F3EB' }]}>
                <Text style={styles.classBadgeText}>CLASS</Text>
              </View>
              <Text style={styles.classTitle}>{title}</Text>
            </View>
            
            {/* Info Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={14} color="#6A6A6A" />
                <Text style={styles.infoText}>{time}</Text>
              </View>
              {location && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={14} color="#6A6A6A" />
                    <Text style={styles.infoText}>{location}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButtonRecord}
            onPress={handleRecordPress}
            activeOpacity={0.7}
          >
            <Ionicons name="mic" size={18} color="#C33A3A" />
            <Text style={styles.actionButtonText}>Record</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButtonPDF}
            onPress={handleAddPDF}
            activeOpacity={0.7}
            disabled={isUploadingPDF}
          >
            {isUploadingPDF ? (
              <ActivityIndicator size="small" color="#2B59D1" />
            ) : (
              <Ionicons name="document-attach" size={18} color="#2B59D1" />
            )}
            <Text style={styles.actionButtonText}>
              {isUploadingPDF ? 'Uploading...' : 'Add PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButtonAssignment}
            activeOpacity={0.7}
            onPress={() => {
              router.push({
                pathname: '/assignment/create',
                params: { 
                  classId: id,
                  title,
                  time,
                  type,
                  location,
                  color,
                },
              });
            }}
          >
            <Ionicons name="document-text" size={18} color="#FFAB3D" />
            <Text style={styles.actionButtonText}>Assignment</Text>
          </TouchableOpacity>

        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && (
                <View style={[styles.tabIndicator, { backgroundColor: color || '#215732' }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {resourcesError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#92400e" />
            <Text style={styles.errorText} numberOfLines={2}>
              {resourcesError}
            </Text>
            <TouchableOpacity onPress={loadResources}>
              <Text style={styles.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View style={styles.tabContent}>
          {activeTab === 'files' && (
            <ClassFilesSection 
              files={files} 
              isLoading={isLoadingResources}
              onFilePress={async (file) => {
                try {
                  const userId = user?.uid;
                  if (!userId) {
                    Alert.alert('Error', 'You must be logged in to view PDFs');
                    return;
                  }
                  
                  console.log('Opening PDF:', file.id);
                  const pdf = await getPDF(file.id, userId);
                  console.log('PDF loaded:', pdf);
                  
                  if (!pdf) {
                    Alert.alert('Error', 'PDF not found');
                    return;
                  }
                  
                  setSelectedPDF(pdf);
                  setShowPDFViewer(true);
                } catch (error: any) {
                  console.error('Error loading PDF:', error);
                  Alert.alert('Error', error.message || 'Failed to load PDF');
                }
              }}
              onUploadPress={handleAddPDF}
            />
          )}

          {activeTab === 'recordings' && (
            <ClassRecordingsSection
              recordings={recordings}
              isLoading={isLoadingResources}
              onRecordNew={handleRecordPress}
            />
          )}

          {activeTab === 'assignments' && (
            <ClassAssignmentsSection
              assignments={assignments}
              isLoading={isLoadingResources}
              onStatusUpdate={handleStatusUpdate}
              classId={id}
              onAssignmentPress={(assignment) => {
                router.push({
                  pathname: '/assignment/[id]',
                  params: {
                    id: assignment.id,
                    classId: assignment.classId || id,
                  },
                });
              }}
            />
          )}

          {activeTab === 'exams' && (
            <ClassExamsSection
              exams={exams}
              isLoading={isLoadingResources}
              classId={id}
              onExamPress={(exam) => {
                router.push({
                  pathname: '/exam/[id]',
                  params: {
                    id: exam.id,
                    classId: exam.classId || id,
                  },
                });
              }}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* PDF Viewer */}
      {selectedPDF && user?.uid && (
        <PDFViewer
          visible={showPDFViewer}
          pdf={selectedPDF}
          userId={user.uid}
          onClose={() => {
            setShowPDFViewer(false);
            setSelectedPDF(null);
          }}
          onUpdate={() => {
            loadResources();
            if (selectedPDF) {
              getPDF(selectedPDF.id, user.uid).then(setSelectedPDF).catch(console.error);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  backButton: {
    marginBottom: 16,
  },
  headerContent: {
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  classBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#215732',
    letterSpacing: 0.5,
  },
  classTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0D1A0D',
    letterSpacing: -0.3,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6A6A6A',
    fontWeight: '400',
  },
  infoDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F2',
    marginHorizontal: 20,
    marginVertical: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  actionButtonRecord: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: '#FCECEC',
    borderRadius: 12,
  },
  actionButtonPDF: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: '#E8F0FF',
    borderRadius: 12,
  },
  actionButtonAssignment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: '#FFF4E0',
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0D1A0D',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 20,
  },
  tab: {
    paddingBottom: 12,
    paddingTop: 12,
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },
  activeTab: {},
  tabText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8A8A8A',
  },
  activeTabText: {
    color: '#0F3F2E',
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#0F3F2E',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  errorRetry: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  tabContent: {
    minHeight: 120,
  },
});
