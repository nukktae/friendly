import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AssignmentDetailScreenProps {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  location?: string;
  color?: string;
  onBack: () => void;
}

export default function AssignmentDetailScreen({
  id,
  title,
  date,
  time,
  type,
  location,
  color,
  onBack,
}: AssignmentDetailScreenProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeSection, setActiveSection] = useState<'details' | 'attachments' | 'submission'>('details');

  // Calculate days until
  const daysUntil = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil <= 2;
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fafafa', '#ffffff']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Details</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card */}
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.heroTop}>
            <View style={[styles.typeIcon, { backgroundColor: type === 'exam' ? '#fee2e2' : '#dbeafe' }]}>
              <Ionicons 
                name={type === 'exam' ? 'clipboard' : 'document-text'} 
                size={28} 
                color={type === 'exam' ? '#dc2626' : '#2563eb'} 
              />
            </View>
            <View style={[
              styles.typeBadge,
              { backgroundColor: type === 'exam' ? '#fef2f2' : '#eff6ff' }
            ]}>
              <Text style={[
                styles.typeBadgeText,
                { color: type === 'exam' ? '#dc2626' : '#2563eb' }
              ]}>
                {type === 'exam' ? 'EXAM' : 'ASSIGNMENT'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.heroTitle}>{title}</Text>
          
          {/* Countdown */}
          <View style={[
            styles.countdownCard,
            isUrgent && styles.countdownCardUrgent
          ]}>
            <LinearGradient
              colors={isUrgent ? ['#fee2e2', '#fef2f2'] : ['#ecfdf5', '#f0fdf4']}
              style={styles.countdownGradient}
            >
              <View style={styles.countdownContent}>
                <View style={[
                  styles.countdownNumber,
                  { backgroundColor: isUrgent ? '#dc2626' : '#10b981' }
                ]}>
                  <Text style={styles.countdownNumberText}>{daysUntil}</Text>
                </View>
                <View style={styles.countdownInfo}>
                  <Text style={styles.countdownLabel}>
                    {isUrgent ? 'URGENT' : 'DAYS LEFT'}
                  </Text>
                  <Text style={[
                    styles.countdownDate,
                    { color: isUrgent ? '#991b1b' : '#065f46' }
                  ]}>
                    Due {formattedDate}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Info Cards Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={20} color="#6B7C32" />
            </View>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{time}</Text>
          </View>

          {location && (
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={20} color="#6B7C32" />
              </View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{location}</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#6B7C32" />
            </View>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>Pending</Text>
          </View>
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'details' && styles.sectionTabActive]}
            onPress={() => setActiveSection('details')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'details' && styles.sectionTabTextActive]}>
              Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'attachments' && styles.sectionTabActive]}
            onPress={() => setActiveSection('attachments')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'attachments' && styles.sectionTabTextActive]}>
              Attachments
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'submission' && styles.sectionTabActive]}
            onPress={() => setActiveSection('submission')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'submission' && styles.sectionTabTextActive]}>
              Submission
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Content */}
        {activeSection === 'details' && (
          <View style={styles.sectionContent}>
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Description</Text>
              <Text style={styles.contentText}>
                {type === 'exam' 
                  ? 'Comprehensive examination covering all topics discussed during the semester. Make sure to review all lecture materials, assignments, and practice problems. The exam will test your understanding of key concepts and problem-solving abilities.'
                  : 'Complete this assignment following the guidelines provided in class. Submit your work through the online portal before the deadline. Late submissions will be subject to grade penalties unless prior arrangements have been made.'}
              </Text>
            </View>

            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Requirements</Text>
              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.requirementText}>Review all course materials</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.requirementText}>Complete practice problems</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.requirementText}>Prepare necessary documents</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeSection === 'attachments' && (
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.attachmentCard}>
              <View style={styles.attachmentIcon}>
                <Ionicons name="document-text" size={24} color="#dc2626" />
              </View>
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName}>Assignment Guidelines.pdf</Text>
                <Text style={styles.attachmentSize}>2.4 MB • 12 pages</Text>
              </View>
              <TouchableOpacity style={styles.downloadButton}>
                <Ionicons name="download-outline" size={20} color="#6B7C32" />
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachmentCard}>
              <View style={styles.attachmentIcon}>
                <Ionicons name="document-text" size={24} color="#dc2626" />
              </View>
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName}>Reference Material.pdf</Text>
                <Text style={styles.attachmentSize}>1.8 MB • 8 pages</Text>
              </View>
              <TouchableOpacity style={styles.downloadButton}>
                <Ionicons name="download-outline" size={20} color="#6B7C32" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'submission' && (
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.uploadCard}>
              <LinearGradient
                colors={['#f0f9ff', '#e0f2fe']}
                style={styles.uploadGradient}
              >
                <View style={styles.uploadIcon}>
                  <Ionicons name="cloud-upload-outline" size={40} color="#2563eb" />
                </View>
                <Text style={styles.uploadTitle}>Upload Your Work</Text>
                <Text style={styles.uploadSubtitle}>Tap to select files or documents</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.submissionInfo}>
              <View style={styles.submissionItem}>
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                <Text style={styles.submissionText}>Maximum file size: 10 MB</Text>
              </View>
              <View style={styles.submissionItem}>
                <Ionicons name="document-outline" size={18} color="#6b7280" />
                <Text style={styles.submissionText}>Accepted formats: PDF, DOC, DOCX</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bottomButtonSecondary}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={18} color="#6B7C32" />
          <Text style={styles.bottomButtonSecondaryText}>Remind</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bottomButtonPrimary}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6B7C32', '#556B2F']}
            style={styles.bottomButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.bottomButtonPrimaryText}>Mark Complete</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  countdownCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  countdownCardUrgent: {
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  countdownGradient: {
    padding: 16,
  },
  countdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countdownNumber: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumberText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  countdownInfo: {
    flex: 1,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 4,
  },
  countdownDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  sectionTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  sectionTabTextActive: {
    color: '#111827',
  },
  sectionContent: {
    gap: 16,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 24,
  },
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requirementText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 12,
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  attachmentSize: {
    fontSize: 13,
    color: '#9ca3af',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#dbeafe',
    borderStyle: 'dashed',
  },
  uploadGradient: {
    padding: 32,
    alignItems: 'center',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  submissionInfo: {
    gap: 12,
  },
  submissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  submissionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  bottomButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  bottomButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7C32',
  },
  bottomButtonPrimary: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6B7C32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bottomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  bottomButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

