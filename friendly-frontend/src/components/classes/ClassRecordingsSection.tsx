import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassRecording } from '@/src/types';
import { SkeletonList } from '@/src/components/common/Skeleton';

interface ClassRecordingsSectionProps {
  recordings: ClassRecording[];
  isLoading?: boolean;
  onRecordingPress?: (recording: ClassRecording) => void;
  onRecordNew?: () => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds && seconds !== 0) {
    return 'Unknown duration';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

const formatDate = (value?: string | { _seconds?: number; _nanoseconds?: number; seconds?: number; nanoseconds?: number }) => {
  if (!value) return 'Date not available';
  
  let date: Date;
  if (typeof value === 'string') {
    date = new Date(value);
  } else if (value._seconds) {
    date = new Date(value._seconds * 1000);
  } else if (value.seconds) {
    date = new Date(value.seconds * 1000);
  } else {
    return 'Date not available';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

const formatTime = (value?: string | { _seconds?: number; _nanoseconds?: number; seconds?: number; nanoseconds?: number }) => {
  if (!value) return '';
  
  let date: Date;
  if (typeof value === 'string') {
    date = new Date(value);
  } else if (value._seconds) {
    date = new Date(value._seconds * 1000);
  } else if (value.seconds) {
    date = new Date(value.seconds * 1000);
  } else {
    return '';
  }
  
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function ClassRecordingsSection({
  recordings,
  isLoading,
  onRecordingPress,
  onRecordNew,
}: ClassRecordingsSectionProps) {
  // Show loading skeleton only if actively loading AND no recordings yet
  if (isLoading && recordings.length === 0) {
    return (
      <View style={styles.list}>
        <SkeletonList count={3} itemHeight={80} />
      </View>
    );
  }

  // Show empty state if not loading and no recordings
  if (!isLoading && !recordings.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="mic" size={48} color="#D9534F" />
        </View>
        <Text style={styles.emptyTitle}>No recordings yet</Text>
        <Text style={styles.emptyText}>
          Record audio notes for this class
        </Text>
        <TouchableOpacity style={styles.recordButton} onPress={onRecordNew} activeOpacity={0.8}>
          <Text style={styles.recordButtonText}>Start Recording</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {recordings.map((recording) => (
        <TouchableOpacity
          key={recording.id}
          style={styles.card}
          onPress={() => onRecordingPress?.(recording)}
          activeOpacity={0.98}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="mic" size={22} color="#D9534F" />
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
                {(recording as any).transcriptText 
                  ? ((recording as any).transcriptText.substring(0, 60) + ((recording as any).transcriptText.length > 60 ? '...' : ''))
                  : recording.title}
              </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {formatDate(recording.recordedAt)} {formatTime(recording.recordedAt)}
              {recording.duration && ` · ${formatDuration(recording.duration)}`}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.moreButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              onRecordingPress?.(recording);
            }}
          >
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
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
    backgroundColor: '#FCECEC',
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
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
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
    backgroundColor: '#FCECEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  recordButton: {
    height: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2F602E',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 15,
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

