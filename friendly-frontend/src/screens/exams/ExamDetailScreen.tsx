import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ExamDetailScreenProps {
  id: string;
  title: string;
  date: string;
  description?: string;
  durationMinutes?: number;
  location?: string;
  instructions?: string;
  status?: 'upcoming' | 'completed' | 'missed' | 'in_progress';
  classId?: string;
  onBack: () => void;
  error?: string;
}

export default function ExamDetailScreen({
  id,
  title,
  date,
  description,
  durationMinutes,
  location,
  instructions,
  status = 'upcoming',
  classId,
  onBack,
  error,
}: ExamDetailScreenProps) {
  const router = useRouter();

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exam</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const statusBadgeStyle = {
    upcoming: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
    completed: { bg: '#F7F7F7', text: '#4A4A4A' },
    missed: { bg: 'rgba(0,0,0,0.04)', text: '#8A8A8A' },
    in_progress: { bg: 'rgba(15,63,46,0.08)', text: '#0F3F2E' },
  }[status] || statusBadgeStyle.upcoming;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exam</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>{title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadgeStyle.text }]}>
                {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
          </View>

          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <Ionicons name="calendar-outline" size={16} color="#6A6A6A" />
              <Text style={styles.metadataText}>{formatDate(date)}</Text>
            </View>
            {durationMinutes && (
              <View style={styles.metadataRow}>
                <Ionicons name="time-outline" size={16} color="#6A6A6A" />
                <Text style={styles.metadataText}>{durationMinutes} minutes</Text>
              </View>
            )}
            {location && (
              <View style={styles.metadataRow}>
                <Ionicons name="location-outline" size={16} color="#6A6A6A" />
                <Text style={styles.metadataText}>{location}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />
        </View>

        {/* Description Section */}
        {description && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        )}

        {/* Instructions Section */}
        {instructions && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.descriptionText}>{instructions}</Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 22,
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  heroTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 30,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  metadataContainer: {
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});

