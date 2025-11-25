import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Choose Your Plan</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Basic Plan */}
                <View style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>Basic</Text>
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>Free</Text>
                    </View>
                  </View>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={styles.featureText}>Basic GPA tracking</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={styles.featureText}>Course management</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={styles.featureText}>Graduation requirements analysis</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={styles.featureText}>Credit calculation</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.basicButton}
                    onPress={onClose}
                  >
                    <Text style={styles.basicButtonText}>Continue with Basic</Text>
                  </TouchableOpacity>
                </View>

                {/* Premium Plan */}
                <View style={[styles.planCard, styles.premiumCard]}>
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={14} color="#FFFFFF" />
                    <Text style={styles.premiumBadgeText}>Recommended</Text>
                  </View>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>Premium</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>₩3,000</Text>
                      <Text style={styles.pricePeriod}>/month</Text>
                    </View>
                  </View>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#426b1f" />
                      <Text style={styles.featureText}>Everything in Basic</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#426b1f" />
                      <Text style={styles.featureText}>Advanced graduation planning</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#426b1f" />
                      <Text style={styles.featureText}>심화전공 / 부전공 / 다전공 calculations</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#426b1f" />
                      <Text style={styles.featureText}>AI-powered course suggestions</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#426b1f" />
                      <Text style={styles.featureText}>Priority support</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.premiumButton}
                    onPress={() => {
                      // TODO: Handle premium subscription
                      console.log('Premium subscription clicked');
                      onClose();
                    }}
                  >
                    <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: 600,
  },
  planCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#426b1f',
    borderWidth: 2,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#426b1f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  freeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#426b1f',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#426b1f',
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  basicButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  basicButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  premiumButton: {
    backgroundColor: '#426b1f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#426b1f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

