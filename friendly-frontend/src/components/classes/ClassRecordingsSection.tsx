import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassRecording } from '@/src/types';

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

const formatDate = (value?: string) => {
  if (!value) return 'Date not available';
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
};

export function ClassRecordingsSection({
  recordings,
  isLoading,
  onRecordingPress,
  onRecordNew,
}: ClassRecordingsSectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B7C32" />
        <Text style={styles.loadingText}>Loading recordings...</Text>
      </View>
    );
  }

  if (!recordings.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No recordings yet</Text>
        <Text style={styles.emptyText}>
          Start recording lectures to capture transcripts and summaries.
        </Text>
        <TouchableOpacity style={styles.recordButton} onPress={onRecordNew}>
          <Ionicons name="mic" size={18} color="#fff" />
          <Text style={styles.recordButtonText}>Record Lecture</Text>
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
          activeOpacity={0.8}
        >
          <View style={styles.icon}>
            <Ionicons name="mic" size={24} color="#ef4444" />
          </View>

          <View style={styles.info}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{recording.title}</Text>
              <View style={[styles.statusChip, styles[`status_${recording.status}`]]}>
                <Text style={styles.statusText}>{recording.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.metaText}>{formatDate(recording.recordedAt)}</Text>
            <Text style={styles.metaText}>{formatDuration(recording.duration)}</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  status_processing: {
    backgroundColor: '#f59e0b',
  },
  status_ready: {
    backgroundColor: '#10b981',
  },
  status_failed: {
    backgroundColor: '#ef4444',
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
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6B7C32',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  recordButtonText: {
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

