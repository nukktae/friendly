import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassFile } from '@/src/types';

interface ClassFilesSectionProps {
  files: ClassFile[];
  isLoading?: boolean;
  onFilePress?: (file: ClassFile) => void;
  onUploadPress?: () => void;
}

export function ClassFilesSection({
  files,
  isLoading,
  onFilePress,
  onUploadPress,
}: ClassFilesSectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6B7C32" />
        <Text style={styles.loadingText}>Loading files...</Text>
      </View>
    );
  }

  if (!files.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-outline" size={48} color="#d1d5db" />
        </View>
        <Text style={styles.emptyTitle}>No files yet</Text>
        <Text style={styles.emptyText}>Upload PDFs, notes, or other materials</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onUploadPress}>
          <Text style={styles.emptyButtonText}>Upload File</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {files.map((file) => (
        <TouchableOpacity
          key={file.id}
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => onFilePress?.(file)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={24} color="#ef4444" />
            <View style={styles.pdfBadge}>
              <Text style={styles.pdfBadgeText}>{(file.fileType || 'PDF').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.info}>
            <Text style={styles.name}>{file.title}</Text>
            <View style={styles.metaRow}>
              {typeof file.pages === 'number' && (
                <>
                  <Text style={styles.metaText}>{file.pages} pages</Text>
                  <View style={styles.dot} />
                </>
              )}
              {file.size && (
                <>
                  <Text style={styles.metaText}>{file.size}</Text>
                  <View style={styles.dot} />
                </>
              )}
              {file.uploadedAt && (
                <Text style={styles.metaText}>
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  pdfBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pdfBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6B7C32',
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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

