import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '@/src/context/AppContext';
import {
  ClassAssignmentsSection,
  ClassFilesSection,
  ClassRecordingsSection,
} from '@/src/components/classes';
import {
  fetchClassAssignments,
  fetchClassFiles,
  fetchClassRecordings,
  updateAssignment,
} from '@/src/services/classes/classResourcesService';
import { ClassAssignment, ClassFile, ClassRecording } from '@/src/types';
import { PDFViewer } from '@/src/components/pdf/PDFViewer';
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
  onBack: () => void;
  onRecordPress?: () => void;
}

type TabKey = 'files' | 'recordings' | 'assignments';

export default function ClassDetailScreen({
  id,
  title,
  time,
  type,
  location,
  instructor,
  color,
  onBack,
  onRecordPress,
}: ClassDetailScreenProps) {
  const router = useRouter();
  const { user } = useApp();
  const scrollY = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<TabKey>('files');
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
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

      // Only fetch recordings if userId is available (required for recordings endpoint)
      let recordingsData: ClassRecording[] = [];
      if (userId) {
        try {
          recordingsData = await fetchClassRecordings(id, userId);
        } catch (error) {
          console.warn('Failed to fetch recordings:', error);
          // Continue with empty recordings array
        }
      }

      if (!isMountedRef.current) return;

      setFiles(filesData);
      setRecordings(recordingsData);
      setAssignments(assignmentsData);
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
      await updateAssignment(assignmentId, classId, user.uid, { status });
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
  ];

  // Calculate deadline
  const getDeadline = () => {
    if (type === 'exam') return 'Oct 15, 2025 - 2:00 PM';
    if (type === 'assignment') return 'Oct 5, 2025 - 11:59 PM';
    return 'No upcoming deadline';
  };

  const getDaysUntil = () => {
    if (type === 'exam') return 13;
    if (type === 'assignment') return 3;
    return null;
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
        <TouchableOpacity onPress={onBack} style={styles.topBackButton}>
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
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <View style={[styles.typeChip, { backgroundColor: color || '#6B7C32' }]}>
                <Text style={styles.typeChipText}>{(type || 'CLASS').toUpperCase()}</Text>
              </View>
              <Text style={styles.compactTitle}>{title}</Text>
            </View>
            
            {/* Compact Info Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.infoText}>{time}</Text>
              </View>
              {location && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.infoText}>{location}</Text>
                  </View>
                </>
              )}
              {instructor && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoItem}>
                    <Ionicons name="person-outline" size={14} color="#6b7280" />
                    <Text style={styles.infoText}>{instructor}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Deadline Alert */}
        {(type === 'exam' || type === 'assignment') && (
          <View style={styles.deadlineCard}>
            <View style={styles.deadlineHeader}>
              <View style={[styles.deadlineIcon, { backgroundColor: getDaysUntil()! <= 5 ? '#fef3c7' : '#dbeafe' }]}>
                <Ionicons 
                  name={type === 'exam' ? 'alert-circle' : 'timer-outline'} 
                  size={24} 
                  color={getDaysUntil()! <= 5 ? '#f59e0b' : '#3b82f6'} 
                />
              </View>
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineLabel}>
                  {type === 'exam' ? 'Exam Date' : 'Due Date'}
                </Text>
                <Text style={styles.deadlineDate}>{getDeadline()}</Text>
              </View>
              <View style={styles.daysChip}>
                <Text style={styles.daysText}>{getDaysUntil()} days</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onRecordPress}
            activeOpacity={0.7}
          >
            <Ionicons name="mic" size={18} color="#ef4444" />
            <Text style={styles.actionButtonText}>Record</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAddPDF}
            activeOpacity={0.7}
            disabled={isUploadingPDF}
          >
            {isUploadingPDF ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons name="document-attach" size={18} color="#3b82f6" />
            )}
            <Text style={styles.actionButtonText}>
              {isUploadingPDF ? 'Uploading...' : 'Add PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              router.push({
                pathname: '/assignment/create',
                params: { 
                  classId: id,
                  // Pass current screen params so we can navigate back properly
                  title,
                  time,
                  type,
                  location,
                  color,
                },
              });
            }}
          >
            <Ionicons name="create" size={18} color="#f59e0b" />
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
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

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
              onRecordNew={onRecordPress}
            />
          )}

          {activeTab === 'assignments' && (
            <ClassAssignmentsSection
              assignments={assignments}
              isLoading={isLoadingResources}
              onStatusUpdate={handleStatusUpdate}
              classId={id}
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
  compactHeader: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  headerContent: {
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  compactTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '400',
  },
  infoDivider: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#d1d5db',
  },
  deadlineCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  deadlineDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  daysChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7C32',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: {
    paddingBottom: 10,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#111827',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6B7C32',
    borderRadius: 1,
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
