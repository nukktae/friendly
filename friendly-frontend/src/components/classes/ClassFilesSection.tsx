import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClassFile } from '@/src/types';
import { SkeletonList, SkeletonCard } from '@/src/components/common/Skeleton';

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
  // Show loading skeleton only if actively loading AND no files yet
  if (isLoading && files.length === 0) {
    return (
      <View style={styles.list}>
        <SkeletonList count={3} itemHeight={80} />
      </View>
    );
  }

  // Show empty state if not loading and no files
  if (!isLoading && !files.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-text" size={48} color="#2B59D1" />
        </View>
        <Text style={styles.emptyTitle}>No files yet</Text>
        <Text style={styles.emptyText}>Upload PDFs, notes, or other materials</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onUploadPress} activeOpacity={0.8}>
          <Text style={styles.emptyButtonText}>Upload File</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatMetadata = (file: ClassFile) => {
    const parts: string[] = [];
    if (typeof file.pages === 'number') {
      parts.push(`${file.pages} pages`);
    }
    if (file.size) {
      parts.push(file.size);
    }
    if (file.uploadedAt) {
      parts.push(formatDate(file.uploadedAt));
    }
    return parts.join(' · ');
  };

  return (
    <View style={styles.list}>
      {files.map((file) => (
        <TouchableOpacity
          key={file.id}
          style={styles.card}
          activeOpacity={0.98}
          onPress={() => onFilePress?.(file)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={22} color="#2B59D1" />
            <View style={styles.pdfBadge}>
              <Text style={styles.pdfBadgeText}>{(file.fileType || 'PDF').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{file.title}</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {formatMetadata(file)}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.moreButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              // TODO: Show overflow menu
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
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
    backgroundColor: '#E9F1FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  pdfBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    backgroundColor: '#2B59D1',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  pdfBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
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
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E9F1FA',
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
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
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
  emptyButtonText: {
    fontSize: 15,
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

