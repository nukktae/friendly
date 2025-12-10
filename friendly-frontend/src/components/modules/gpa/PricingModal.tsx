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
                <View style={styles.headerIcon}>
                  <View style={styles.headerDot} />
                </View>
                <Text style={styles.headerTitle}>Choose Your Plan</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Basic Plan */}
                <View style={styles.basicCard}>
                  <View style={styles.basicHeader}>
                    <Text style={styles.planName}>BASIC</Text>
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>Free</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>GPA tracking</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>Course management</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>Requirement analysis</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>Credit calculation</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.basicButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.basicButtonText}>Continue with Basic</Text>
                    <Ionicons name="chevron-forward" size={16} color="#0F3F2E" />
                  </TouchableOpacity>
                </View>

                {/* Premium Plan */}
                <View style={styles.premiumCard}>
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="star-outline" size={14} color="#0F3F2E" />
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                  <View style={styles.premiumHeader}>
                    <Text style={styles.planName}>PREMIUM</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>₩3,000</Text>
                      <Text style={styles.pricePeriod}>/month</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>Everything in Basic</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>Advanced planning</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>전공 / 부전공 / 다전공 calculations</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
                      <Text style={styles.featureText}>AI-powered suggestions</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={18} color="#0F3F2E" />
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
                    activeOpacity={0.9}
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  headerIcon: {
    width: 40,
    alignItems: 'center',
  },
  headerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-end',
    padding: 4,
  },
  scrollContent: {
    maxHeight: 600,
  },
  basicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E7E7',
  },
  basicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: 'rgba(15, 63, 46, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F3F2E',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E7E7E7',
    marginBottom: 20,
  },
  premiumCard: {
    backgroundColor: 'rgba(15, 63, 46, 0.06)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#0F3F2E',
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#0F3F2E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F3F2E',
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 14,
    color: '#6A6A6A',
    fontWeight: '400',
  },
  featuresList: {
    gap: 14,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '400',
    flex: 1,
    letterSpacing: -0.2,
  },
  basicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#0F3F2E',
    gap: 6,
  },
  basicButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F3F2E',
    letterSpacing: -0.2,
  },
  premiumButton: {
    backgroundColor: '#0F3F2E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0F3F2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 50,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});

