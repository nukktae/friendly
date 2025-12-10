import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
    Animated,
  Platform,
    ScrollView,
  StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useApp } from '@/src/context/AppContext';
import { getAssignmentById, updateAssignment, deleteAssignment } from '@/src/services/classes/classResourcesService';
import { ClassAssignment } from '@/src/types';

const ASSIGNMENT_TYPE_ICONS: Record<string, string> = {
  ppt: 'document-text',
  report: 'document',
  'team-meeting': 'people',
  exam: 'school',
  homework: 'create',
  project: 'folder',
  other: 'ellipse',
};

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  ppt: 'PPT',
  report: 'Report',
  'team-meeting': 'Team Meeting',
  exam: 'Exam',
  homework: 'Homework',
  project: 'Project',
  other: 'Other',
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  not_started: { bg: '#E2E8F0', text: '#475569' },
  in_progress: { bg: '#FFE9C7', text: '#C58104' },
  completed: { bg: '#E8F5E9', text: '#2F602E' },
};

interface AssignmentDetailScreenProps {
  id: string;
  classId: string;
}

export default function AssignmentDetailScreen({
  id,
  classId,
}: AssignmentDetailScreenProps) {
  const router = useRouter();
  const { user } = useApp();
  const [assignment, setAssignment] = useState<ClassAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const statusBadgeAnim = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/explore');
      }
    } catch (error) {
      router.push('/(tabs)/explore');
    }
  };

  const currentStatus = assignment?.status || 'not_started';
  const statusBadgeStyle = STATUS_BADGE_STYLES[currentStatus] || STATUS_BADGE_STYLES.not_started;

  useEffect(() => {
    loadAssignment();
  }, [id, classId, user?.uid]);

  useEffect(() => {
    if (showToast) {
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowToast(false);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadAssignment = async () => {
    if (!id || !classId || !user?.uid) {
      setError('Missing required parameters');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getAssignmentById(id, classId, user.uid);
      setAssignment(data);
    } catch (err: any) {
      console.error('Error loading assignment:', err);
      setError(err.message || 'Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const handleStatusChange = async (newStatus: 'not_started' | 'in_progress' | 'completed') => {
    if (!classId || !user?.uid || isUpdating) return;

    try {
      setIsUpdating(true);

      // Animate status badge
      Animated.sequence([
        Animated.timing(statusBadgeAnim, {
          toValue: 0.95,
          duration: 100,
        useNativeDriver: true,
      }),
        Animated.timing(statusBadgeAnim, {
        toValue: 1,
          duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

      await updateAssignment(id, classId, user.uid, { status: newStatus });
      
      const updated = await getAssignmentById(id, classId, user.uid);
      setAssignment(updated);

      // Show toast
      const statusLabels: Record<string, string> = {
        not_started: 'Not Started',
        in_progress: 'In Progress',
        completed: 'Completed',
      };
      setToastMessage(`Marked as ${statusLabels[newStatus]}`);
      setShowToast(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!classId || !user?.uid || !assignment) return;

    Alert.alert(
      'Delete Assignment',
      'Are you sure you want to delete this assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (assignment) {
                await deleteAssignment(assignment.id, classId, user.uid);
                handleBack();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete assignment');
            }
          },
        },
      ]
    );
  };

  const getPrimaryAction = () => {
    switch (currentStatus) {
      case 'not_started':
        return { label: 'Start Assignment', action: () => handleStatusChange('in_progress') };
      case 'in_progress':
        return { label: 'Mark as Completed', action: () => handleStatusChange('completed') };
      case 'completed':
        return { label: 'Mark as In Progress', action: () => handleStatusChange('in_progress') };
      default:
        return { label: 'Start Assignment', action: () => handleStatusChange('in_progress') };
    }
  };

  const primaryAction = getPrimaryAction();

  if (error || isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignment</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#426b1f" />
          ) : (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignment</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Assignment not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Assignment Summary Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>{assignment.title}</Text>
            <Animated.View style={{ transform: [{ scale: statusBadgeAnim }] }}>
              <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.bg }]}>
                <Text style={[styles.statusBadgeText, { color: statusBadgeStyle.text }]}>
                  {currentStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
            </Animated.View>
          </View>
          
          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <Ionicons name={(ASSIGNMENT_TYPE_ICONS[assignment.type || 'other'] || 'ellipse') as any} size={16} color="#6B7280" />
              <Text style={styles.metadataText}>{ASSIGNMENT_TYPE_LABELS[assignment.type || 'other'] || 'Other'}</Text>
                </View>
            {assignment.dueDate && (
              <View style={styles.metadataRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.metadataText}>{formatDateOnly(assignment.dueDate)}</Text>
                </View>
            )}
            {assignment.dueDate && (
              <View style={styles.metadataRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.metadataText}>{formatTime(assignment.dueDate)}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />
          </View>

        {/* Description Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          {assignment.description ? (
            <Text style={styles.descriptionText}>{assignment.description}</Text>
          ) : (
            <View style={styles.emptyDescription}>
              <Text style={styles.emptyDescriptionText}>No description added.</Text>
            </View>
          )}
        </View>

        {/* Attachments Section - Placeholder for future */}
        {/* Will be added when attachments are implemented */}

        {/* Bottom spacing for action buttons */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Section */}
      <View style={styles.bottomActions}>
        {/* Primary Action */}
          <TouchableOpacity
          style={styles.primaryButton}
          onPress={primaryAction.action}
          disabled={isUpdating}
          activeOpacity={0.8}
          >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
          )}
          </TouchableOpacity>
          
        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              router.push({
                pathname: '/assignment/create',
                params: {
                  assignmentId: id,
                  classId: classId,
                },
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color="#374151" />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
            </View>

      {/* Toast Notification */}
      {showToast && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  heroTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 30,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metadataContainer: {
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  emptyDescription: {
    paddingVertical: 16,
  },
  emptyDescriptionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    backgroundColor: '#3E6A35',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 38,
    paddingHorizontal: 14,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 24,
    right: 24,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});
