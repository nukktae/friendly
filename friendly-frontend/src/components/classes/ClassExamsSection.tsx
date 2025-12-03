import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassExam } from '@/src/types';
import { SkeletonList } from '@/src/components/common/Skeleton';

interface ClassExamsSectionProps {
  exams: ClassExam[];
  isLoading?: boolean;
  onExamPress?: (exam: ClassExam) => void;
  classId?: string;
}

const formatExamDate = (value?: string) => {
  if (!value) {
    return 'No date set';
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
  upcoming: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
  completed: { bg: '#F7F7F7', text: '#4A4A4A' },
  missed: { bg: 'rgba(0,0,0,0.04)', text: '#8A8A8A' },
  in_progress: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
};

const getStatusBadgeStyle = (status: string): { bg: string; text: string } => {
  return STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.upcoming;
};

const formatStatusText = (status: string): string => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function ClassExamsSection({
  exams,
  isLoading,
  onExamPress,
  classId,
}: ClassExamsSectionProps) {
  // Show loading skeleton only if actively loading AND no exams yet
  if (isLoading && exams.length === 0) {
    return (
      <View style={styles.list}>
        <SkeletonList count={3} itemHeight={100} />
      </View>
    );
  }

  // Show empty state if not loading and no exams
  if (!isLoading && !exams.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="school" size={48} color="#0F3F2E" />
        </View>
        <Text style={styles.emptyTitle}>No exams yet</Text>
        <Text style={styles.emptyText}>
          Add exams to keep track of important dates.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {exams.map((exam) => {
        const statusBadgeStyle = getStatusBadgeStyle(exam.status);
        const description = exam.description || '';
        const location = exam.location ? ` · ${exam.location}` : '';
        const duration = exam.durationMinutes ? ` · ${exam.durationMinutes} min` : '';
        const subtitle = `${description}${location}${duration}`.trim() || 'No details';

        return (
          <TouchableOpacity
            key={exam.id}
            style={styles.card}
            onPress={() => onExamPress?.(exam)}
            activeOpacity={0.98}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="school" size={22} color="#0F3F2E" />
            </View>

            <View style={styles.info}>
              <View style={styles.headerRow}>
                <Text style={styles.name} numberOfLines={1}>{exam.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusBadgeStyle.text }]}>
                    {formatStatusText(exam.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {subtitle} · {formatExamDate(exam.date)}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation();
                onExamPress?.(exam);
              }}
            >
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(15,63,46,0.08)',
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    backgroundColor: 'rgba(15,63,46,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});

