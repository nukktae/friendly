import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ClassAssignment } from '@/src/types';
import { SkeletonList } from '@/src/components/common/Skeleton';

interface ClassAssignmentsSectionProps {
  assignments: ClassAssignment[];
  isLoading?: boolean;
  onAssignmentPress?: (assignment: ClassAssignment) => void;
  onCreateAssignment?: () => void;
  onStatusUpdate?: (assignmentId: string, classId: string, status: ClassAssignment['status']) => Promise<void>;
  classId?: string; // Optional classId to use as fallback when assignment.classId is missing
}

const formatDueDate = (value?: string) => {
  if (!value) {
    return 'No due date';
  }
  const date = new Date(value);
  const month = date.toLocaleString(undefined, { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: 'numeric',
  });
  return `${month} ${day} at ${time}`;
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  not_started: { bg: '#F5F5F5', text: '#4A4A4A' },
  in_progress: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
  completed: { bg: 'rgba(15,63,46,0.10)', text: '#0F3F2E' },
  // Old status values (for migration support)
  pending: { bg: '#F5F5F5', text: '#4A4A4A' },
  submitted: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
  graded: { bg: 'rgba(15,63,46,0.10)', text: '#0F3F2E' },
  past_due: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
};

// Migration map for old status values
const STATUS_MIGRATION: Record<string, ClassAssignment['status']> = {
  pending: 'not_started',
  submitted: 'in_progress',
  graded: 'completed',
  past_due: 'in_progress',
};

// Get status badge style with fallback for old status values
const getStatusBadgeStyle = (status: string): { bg: string; text: string } => {
  // Normalize old status values
  const normalizedStatus = STATUS_MIGRATION[status] || status as ClassAssignment['status'];
  return STATUS_BADGE_STYLES[normalizedStatus] || STATUS_BADGE_STYLES.not_started;
};

// Normalize status value (convert old to new)
const normalizeStatus = (status: string): ClassAssignment['status'] => {
  return STATUS_MIGRATION[status] || (status as ClassAssignment['status']);
};

// Format status text for display
const formatStatusText = (status: string): string => {
  const normalized = normalizeStatus(status);
  return normalized.replace('_', ' ');
};

const STATUS_OPTIONS: Array<{ value: ClassAssignment['status']; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function ClassAssignmentsSection({
  assignments,
  isLoading,
  onAssignmentPress,
  onCreateAssignment,
  onStatusUpdate,
  classId: propClassId,
}: ClassAssignmentsSectionProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const statusChipRefs = React.useRef<Record<string, any>>({});

  const handleStatusPress = (assignment: ClassAssignment, event?: any) => {
    if (!onStatusUpdate) {
      console.warn('onStatusUpdate callback not provided');
      Alert.alert('Error', 'Status update is not available');
      return;
    }

    // Use assignment.classId if available, otherwise fall back to prop classId
    const classId = assignment.classId || propClassId;
    if (!classId) {
      console.warn('Assignment missing classId:', assignment);
      Alert.alert('Error', 'Assignment is missing class information');
      return;
    }

    const normalizedStatus = normalizeStatus(assignment.status);
    const currentStatusIndex = STATUS_OPTIONS.findIndex(opt => opt.value === normalizedStatus);
    const otherOptions = STATUS_OPTIONS.filter(opt => opt.value !== normalizedStatus);

    if (otherOptions.length === 0) {
      Alert.alert('Info', 'No other status options available');
      return;
    }

    // Measure position if we have a ref (for web)
    if (Platform.OS === 'web') {
      const chipRef = statusChipRefs.current[assignment.id];
      if (chipRef) {
        // Use setTimeout to ensure the ref is measured after render
        setTimeout(() => {
          chipRef.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            if (typeof window !== 'undefined') {
              setDropdownPosition({
                top: pageY + height + 4,
                right: window.innerWidth - pageX - width,
              });
            }
          });
        }, 0);
      }
    }

    // Toggle dropdown for this assignment
    if (selectedAssignmentId === assignment.id) {
      setSelectedAssignmentId(null);
      setDropdownPosition(null);
    } else {
      setSelectedAssignmentId(assignment.id);
    }
  };

  const handleStatusSelect = async (assignment: ClassAssignment, newStatus: ClassAssignment['status']) => {
    setSelectedAssignmentId(null);
    setDropdownPosition(null);
    
    if (!onStatusUpdate) {
      return;
    }

    // Use assignment.classId if available, otherwise fall back to prop classId
    const classId = assignment.classId || propClassId;
    if (!classId) {
      Alert.alert('Error', 'Assignment is missing class information');
      return;
    }

    console.log('Updating status to:', newStatus);
    try {
      await onStatusUpdate(assignment.id, classId, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update status');
    }
  };
  // Show loading skeleton only if actively loading AND no assignments yet
  if (isLoading && assignments.length === 0) {
    return (
      <View style={styles.list}>
        <SkeletonList count={3} itemHeight={100} />
      </View>
    );
  }

  // Show empty state if not loading and no assignments
  if (!isLoading && !assignments.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="folder-outline" size={40} color="#F4C979" />
        </View>
        <Text style={styles.emptyTitle}>No assignments yet</Text>
        <Text style={styles.emptyText}>
          When your professor adds an assignment, it will appear here.
        </Text>
        {onCreateAssignment && (
        <TouchableOpacity style={styles.createButton} onPress={onCreateAssignment} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createButtonText}>Add Assignment</Text>
        </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {assignments.map((assignment) => {
        const normalizedStatus = normalizeStatus(assignment.status);
        const otherOptions = STATUS_OPTIONS.filter(opt => opt.value !== normalizedStatus);
        const classId = assignment.classId || propClassId;
        const showDropdown = selectedAssignmentId === assignment.id && onStatusUpdate && classId;

        return (
          <View key={assignment.id} style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                // Close dropdown if open
                if (showDropdown) {
                  setSelectedAssignmentId(null);
                } else {
                  onAssignmentPress?.(assignment);
                }
              }}
              activeOpacity={0.98}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={22} color="#F4C979" />
              </View>

              <View style={styles.info}>
                <View style={styles.headerRow}>
                  <Text style={styles.name} numberOfLines={1}>{assignment.title}</Text>
                  {onStatusUpdate ? (
                    <TouchableOpacity
                      ref={(ref) => {
                        if (ref) {
                          statusChipRefs.current[assignment.id] = ref;
                        }
                      }}
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusBadgeStyle(assignment.status).bg },
                      ]}
                      onPress={(e) => handleStatusPress(assignment, e)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusText, { color: getStatusBadgeStyle(assignment.status).text }]}>
                        {formatStatusText(assignment.status)}
                      </Text>
                      <Ionicons 
                        name={showDropdown ? "chevron-up-outline" : "chevron-down-outline"} 
                        size={14} 
                        color={getStatusBadgeStyle(assignment.status).text} 
                        style={{ marginLeft: 6 }} 
                      />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusBadgeStyle(assignment.status).bg },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusBadgeStyle(assignment.status).text }]}>
                        {formatStatusText(assignment.status)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.metaText} numberOfLines={1}>
                  {assignment.description 
                    ? `${assignment.description} · ${formatDueDate(assignment.dueDate)}`
                    : formatDueDate(assignment.dueDate)}
                  </Text>
              </View>
            </TouchableOpacity>

            {showDropdown && otherOptions.length > 0 && (
              <>
                <TouchableWithoutFeedback onPress={() => {
                  setSelectedAssignmentId(null);
                  setDropdownPosition(null);
                }}>
                  <View style={styles.dropdownBackdrop} />
                </TouchableWithoutFeedback>
                <View style={[
                  styles.dropdownContainer,
                  dropdownPosition && Platform.OS === 'web' ? {
                    top: dropdownPosition.top,
                    right: dropdownPosition.right,
                  } : {}
                ]}>
                  {otherOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        index === otherOptions.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => handleStatusSelect(assignment, option.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownItemText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    zIndex: 1,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 14,
    zIndex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    minHeight: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(244,201,121,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 24,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  dropdownBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    ...(Platform.OS === 'web' ? {} : {
      position: 'absolute',
    }),
  },
  dropdownContainer: Platform.select({
    web: {
      position: 'fixed',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 99999,
      minWidth: 150,
    },
    default: {
      position: 'absolute',
      top: 60,
      right: 16,
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 9999,
      minWidth: 150,
    },
  }) as any,
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  emptyState: {
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244,201,121,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0F3F2E',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginStart: 8,
  },
});

