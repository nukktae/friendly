import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassNote } from '@/src/types';

interface ClassNotesSectionProps {
  notes: ClassNote[];
  isLoading?: boolean;
  onNotePress?: (note: ClassNote) => void;
  onCreateNote?: () => void;
}

export function ClassNotesSection({
  notes,
  isLoading,
  onNotePress,
  onCreateNote,
}: ClassNotesSectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B7C32" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  if (!notes.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Keep your notes here</Text>
        <Text style={styles.emptyText}>
          Capture key insights, reminders, or follow-up tasks for this class.
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={onCreateNote}>
          <Ionicons name="create" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {notes.map((note) => (
        <TouchableOpacity
          key={note.id}
          style={styles.card}
          onPress={() => onNotePress?.(note)}
          activeOpacity={0.8}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{note.title}</Text>
            {note.updatedAt && (
              <Text style={styles.date}>
                {new Date(note.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            )}
          </View>
          <Text style={styles.content} numberOfLines={3}>
            {note.content}
          </Text>
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
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  content: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
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
    textAlign: 'center',
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

