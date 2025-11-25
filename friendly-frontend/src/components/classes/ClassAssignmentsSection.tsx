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
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

const STATUS_COLORS: Record<string, string> = {
  not_started: '#6b7280',
  in_progress: '#f59e0b',
  completed: '#10b981',
  // Old status values (for migration support)
  pending: '#6b7280',
  submitted: '#f59e0b',
  graded: '#10b981',
  past_due: '#ef4444',
};

// Migration map for old status values
const STATUS_MIGRATION: Record<string, ClassAssignment['status']> = {
  pending: 'not_started',
  submitted: 'in_progress',
  graded: 'completed',
  past_due: 'in_progress',
};

// Get status color with fallback for old status values
const getStatusColor = (status: string): string => {
  // Normalize old status values
  const normalizedStatus = STATUS_MIGRATION[status] || status as ClassAssignment['status'];
  return STATUS_COLORS[normalizedStatus] || STATUS_COLORS.not_started;
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
        <Text style={styles.emptyTitle}>No assignments available</Text>
        <Text style={styles.emptyText}>
          Assignments you add or receive will appear here.
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={onCreateAssignment}>
          <Ionicons name="create" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Create Assignment</Text>
        </TouchableOpacity>
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
              activeOpacity={0.8}
            >
              <View style={styles.icon}>
                <Ionicons name="create" size={20} color="#f59e0b" />
              </View>

              <View style={styles.info}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>{assignment.title}</Text>
                  {onStatusUpdate ? (
                    <TouchableOpacity
                      ref={(ref) => {
                        if (ref) {
                          statusChipRefs.current[assignment.id] = ref;
                        }
                      }}
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusColor(assignment.status) },
                      ]}
                      onPress={(e) => handleStatusPress(assignment, e)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.statusText}>{formatStatusText(assignment.status)}</Text>
                      <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={12} color="#fff" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusColor(assignment.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{formatStatusText(assignment.status)}</Text>
                    </View>
                  )}
                </View>
                {assignment.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {assignment.description}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text style={styles.metaText}>{formatDueDate(assignment.dueDate)}</Text>
                </View>
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
    marginBottom: 12,
    zIndex: 1,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 12,
  },
  info: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
    marginStart: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7C32',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginStart: 8,
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

