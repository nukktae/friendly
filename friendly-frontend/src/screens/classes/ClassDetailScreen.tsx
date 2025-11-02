import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface ClassDetailScreenProps {
  id: string;
  title: string;
  time: string;
  type: string;
  location?: string;
  instructor?: string;
  color?: string;
  onBack: () => void;
  onRecordPress?: () => void;
}

export default function ClassDetailScreen({
  id,
  title,
  time,
  type,
  location,
  instructor,
  color,
  onBack,
  onRecordPress,
}: ClassDetailScreenProps) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<'files' | 'notes'>('files');
  
  // Mock PDF files data
  const pdfFiles = [
    { id: '1', name: 'Lecture 1 - Introduction', size: '2.4 MB', date: 'Sep 15, 2025', pages: 24 },
    { id: '2', name: 'Week 1 Assignment', size: '1.2 MB', date: 'Sep 18, 2025', pages: 5 },
    { id: '3', name: 'Reading Material - Chapter 1', size: '4.8 MB', date: 'Sep 20, 2025', pages: 45 },
    { id: '4', name: 'Study Guide', size: '890 KB', date: 'Sep 22, 2025', pages: 8 },
  ];

  // Mock notes data
  const notes = [
    { id: '1', title: 'Class Notes - Week 1', content: 'Key concepts from introduction...', date: 'Sep 15' },
    { id: '2', title: 'Important Points', content: 'Remember to focus on...', date: 'Sep 18' },
  ];

  // Calculate deadline
  const getDeadline = () => {
    if (type === 'exam') return 'Oct 15, 2025 - 2:00 PM';
    if (type === 'assignment') return 'Oct 5, 2025 - 11:59 PM';
    return 'No upcoming deadline';
  };

  const getDaysUntil = () => {
    if (type === 'exam') return 13;
    if (type === 'assignment') return 3;
    return null;
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.topHeader, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={onBack} style={styles.topBackButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle} numberOfLines={1}>{title}</Text>
      </Animated.View>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={[styles.fab, styles.fabPrimary]}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={[styles.typeChip, { backgroundColor: color || '#6B7C32' }]}>
              <Text style={styles.typeChipText}>{type.toUpperCase()}</Text>
            </View>
            <Text style={styles.compactTitle}>{title}</Text>
            
            {/* Compact Info Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.infoText}>{time}</Text>
              </View>
              <View style={styles.infoDivider} />
              {location && (
                <>
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={styles.infoText}>{location}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                </>
              )}
              {instructor && (
                <View style={styles.infoItem}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>{instructor}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Deadline Alert */}
        {(type === 'exam' || type === 'assignment') && (
          <View style={styles.deadlineCard}>
            <View style={styles.deadlineHeader}>
              <View style={[styles.deadlineIcon, { backgroundColor: getDaysUntil()! <= 5 ? '#fef3c7' : '#dbeafe' }]}>
                <Ionicons 
                  name={type === 'exam' ? 'alert-circle' : 'timer-outline'} 
                  size={24} 
                  color={getDaysUntil()! <= 5 ? '#f59e0b' : '#3b82f6'} 
                />
              </View>
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineLabel}>
                  {type === 'exam' ? 'Exam Date' : 'Due Date'}
                </Text>
                <Text style={styles.deadlineDate}>{getDeadline()}</Text>
              </View>
              <View style={styles.daysChip}>
                <Text style={styles.daysText}>{getDaysUntil()} days</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={onRecordPress}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="mic" size={20} color="#ef4444" />
            </View>
            <Text style={styles.actionLabel}>Record</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="document-attach" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.actionLabel}>Add PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="create" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.actionLabel}>Assignment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#e9d5ff' }]}>
              <Ionicons name="notifications" size={20} color="#a855f7" />
            </View>
            <Text style={styles.actionLabel}>Remind</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'files' && styles.activeTab]}
            onPress={() => setActiveTab('files')}
          >
            <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
              Files ({pdfFiles.length})
            </Text>
            {activeTab === 'files' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
            onPress={() => setActiveTab('notes')}
          >
            <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
              Notes ({notes.length})
            </Text>
            {activeTab === 'notes' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'files' ? (
          <View style={styles.filesContainer}>
            {pdfFiles.map((file, index) => (
              <TouchableOpacity 
                key={file.id} 
                style={styles.fileCard}
                activeOpacity={0.7}
              >
                <View style={styles.fileIconContainer}>
                  <Ionicons name="document-text" size={24} color="#ef4444" />
                  <View style={styles.pdfBadge}>
                    <Text style={styles.pdfBadgeText}>PDF</Text>
                  </View>
                </View>
                
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <View style={styles.fileMeta}>
                    <Text style={styles.fileMetaText}>{file.pages} pages</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.fileMetaText}>{file.size}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.fileMetaText}>{file.date}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.fileAction}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* Empty State */}
            {pdfFiles.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="document-outline" size={48} color="#d1d5db" />
                </View>
                <Text style={styles.emptyTitle}>No files yet</Text>
                <Text style={styles.emptyText}>Upload PDFs, notes, or other materials</Text>
                <TouchableOpacity style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Upload File</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.notesContainer}>
            {notes.map((note) => (
              <TouchableOpacity key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteDate}>{note.date}</Text>
                </View>
                <Text style={styles.noteContent} numberOfLines={2}>{note.content}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPrimary: {
    backgroundColor: '#6B7C32',
  },
  scrollView: {
    flex: 1,
  },
  compactHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  headerContent: {
    gap: 12,
  },
  typeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  compactTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db',
  },
  deadlineCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  deadlineDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  daysChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  daysText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7C32',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: {
    paddingBottom: 12,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#111827',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6B7C32',
    borderRadius: 1,
  },
  filesContainer: {
    paddingHorizontal: 20,
  },
  fileCard: {
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
  fileIconContainer: {
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
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db',
  },
  fileAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  notesContainer: {
    paddingHorizontal: 20,
  },
  noteCard: {
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  noteDate: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  noteContent: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
});
