import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassAssignment } from '@/src/types';

interface ClassAssignmentsSectionProps {
  assignments: ClassAssignment[];
  isLoading?: boolean;
  onAssignmentPress?: (assignment: ClassAssignment) => void;
  onCreateAssignment?: () => void;
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

const STATUS_COLORS: Record<ClassAssignment['status'], string> = {
  pending: '#f59e0b',
  submitted: '#3b82f6',
  graded: '#10b981',
  past_due: '#ef4444',
};

export function ClassAssignmentsSection({
  assignments,
  isLoading,
  onAssignmentPress,
  onCreateAssignment,
}: ClassAssignmentsSectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B7C32" />
        <Text style={styles.loadingText}>Loading assignments...</Text>
      </View>
    );
  }

  if (!assignments.length) {
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
      {assignments.map((assignment) => (
        <TouchableOpacity
          key={assignment.id}
          style={styles.card}
          onPress={() => onAssignmentPress?.(assignment)}
          activeOpacity={0.8}
        >
          <View style={styles.icon}>
            <Ionicons name="create" size={20} color="#f59e0b" />
          </View>

          <View style={styles.info}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{assignment.title}</Text>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: STATUS_COLORS[assignment.status] },
                ]}
              >
                <Text style={styles.statusText}>{assignment.status.replace('_', ' ')}</Text>
              </View>
            </View>
            {assignment.description && (
              <Text style={styles.description} numberOfLines={2}>
                {assignment.description}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{formatDueDate(assignment.dueDate)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusChip: {
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
  emptyState: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6B7C32',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

