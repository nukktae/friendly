import { useApp } from '@/src/context/AppContext';
import { useLanguage, getAllLanguages, Language } from '@/src/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getProfile,
  createProfile,
  updateProfile,
  uploadProfilePicture,
  updateNickname,
  signOut,
  getProfilePictureUrl,
  Profile,
} from '@/src/services/profile/profileService';
import { ENV } from '@/src/config/env';

interface MyProfilePageProps {}

const MyProfilePage: React.FC<MyProfilePageProps> = () => {
  const { user, logout, isAuthenticated, userProfile } = useApp();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  
  // Handle authentication redirect
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login' as any);
    }
  }, [isAuthenticated, router]);
  
  const handleBack = () => {
    router.push('/');
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    nickname: '',
    university: '',
    studentNumber: '',
    major: '',
  });
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Removed authentication redirect - handled at route level in profile.tsx

  useEffect(() => {
    if (user?.uid) {
      loadProfile();
    }
  }, [user?.uid]);

  const loadProfile = async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      let profileData = await getProfile(user.uid);
      
      // If profile doesn't exist, create a basic one
      if (!profileData) {
        try {
          profileData = await createProfile(user.uid, user.email || '', {
            fullName: user.name || '',
            nickname: '',
            university: '',
          });
        } catch (createError: any) {
          console.error('Error creating profile:', createError);
          Alert.alert(
            'Profile Setup',
            'Your profile needs to be set up. Please try again or contact support.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/explore') }]
          );
          return;
        }
      }
      
      setProfile(profileData);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      // Don't show alert for 404 - we handle it above
      if (!error.message?.includes('not found')) {
        Alert.alert('Error', error.message || 'Failed to load profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPress = () => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || '',
        nickname: profile.nickname || '',
        university: profile.university || '',
        studentNumber: profile.studentNumber || '',
        major: profile.major || '',
      });
      setShowEditModal(true);
    }
  };

  const handleLanguageSelect = async (lang: Language) => {
    await setLanguage(lang);
    setShowLanguageModal(false);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid || !profile) return;

    try {
      setIsUpdating(true);
      const updatedProfile = await updateProfile(user.uid, editForm);
      setProfile(updatedProfile);
      setShowEditModal(false);
      await loadProfile(); // Reload to get latest data
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImagePicker = async () => {
    if (!user?.uid) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUpdating(true);
        const { profilePictureUrl, profile: updatedProfile } = await uploadProfilePicture(
          user.uid,
          result.assets[0].uri
        );
        setProfile(updatedProfile);
        await loadProfile();
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      setShowLogoutConfirm(true);
      
      // Get current user's ID token if available
      const firebaseUser = user;
      let idToken: string | undefined;
      if (firebaseUser) {
        try {
          // Try to get ID token from Firebase Auth
          const { getIdToken } = require('firebase/auth');
          const { auth } = require('@/src/config/firebase');
          if (auth.currentUser) {
            idToken = await getIdToken(auth.currentUser);
          }
        } catch (error) {
          console.log('Could not get ID token:', error);
        }
      }

      // Call backend sign out endpoint
      try {
        await signOut(idToken);
      } catch (error) {
        console.log('Backend sign out failed, continuing with client sign out:', error);
      }

      // Sign out from Firebase
      await logout();
      
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          setShowLogoutConfirm(false);
          router.replace('/auth/login' as any);
        }
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutConfirm(false);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const profilePictureUrl = user?.uid && profile?.profilePicture 
    ? getProfilePictureUrl(user.uid, profile.profilePicture)
    : null;

  const formatDate = (date?: { _seconds?: number; _nanoseconds?: number } | Date) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date 
      ? date 
      : new Date((date as { _seconds: number })._seconds * 1000);
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7C32" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Picture */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleImagePicker}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            {profilePictureUrl ? (
              <Image
                source={{ uri: profilePictureUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={40} color="#9CA3AF" />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleImagePicker}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <Ionicons name="camera-outline" size={14} color="#6B7280" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
          
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>
                {profile?.fullName || user?.name || 'User'}
              </Text>
              {profile?.schoolVerified && (
                <View style={styles.verifiedDot} />
              )}
            </View>
            
            {profile?.nickname && (
              <Text style={styles.userNickname}>@{profile.nickname}</Text>
            )}
            
            {profile?.university && (
              <View style={styles.universityContainer}>
                <Ionicons name="school-outline" size={14} color="#6B7280" />
                <Text style={styles.universityText}>{profile.university}</Text>
              </View>
            )}
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditPress}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color="#0F3F2E" />
            <Text style={styles.editButtonText}>{t('profile.edit')}</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.memberSince')}</Text>
              <Text style={styles.infoValue}>
                {formatDate(profile?.createdAt)}
              </Text>
            </View>
          </View>
          {profile?.schoolEmail && (
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('profile.schoolEmail')}</Text>
                <Text style={styles.infoValue}>{profile.schoolEmail}</Text>
              </View>
            </View>
          )}
          {profile?.studentNumber && (
            <View style={styles.infoItem}>
              <Ionicons name="id-card-outline" size={18} color="#9CA3AF" style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('profile.studentNumber')}</Text>
                <Text style={styles.infoValue}>{profile.studentNumber}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoItem}>
            <Ionicons name="school-outline" size={18} color="#9CA3AF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.major')}</Text>
              {profile?.major ? (
                <Text style={styles.infoValue}>{profile.major}</Text>
              ) : (
                <TouchableOpacity
                  onPress={handleEditPress}
                  style={styles.addMajorPill}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-outline" size={14} color="#0F3F2E" />
                  <Text style={styles.addMajorText}>{t('profile.addMajor')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={[styles.infoItem, styles.infoItemLast]}>
            <Ionicons name="language-outline" size={18} color="#9CA3AF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.language')}</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(true)}
                style={styles.languageSelector}
                activeOpacity={0.7}
              >
                <Text style={styles.languageValue}>
                  {getAllLanguages().find(l => l.code === language)?.name || 'English'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.signOutButton}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color="#C64545" />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.chooseLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {getAllLanguages().map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOptionRow,
                    language === lang.code && styles.languageOptionRowSelected,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageOptionRowText,
                      language === lang.code && styles.languageOptionRowTextSelected,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color="#0F3F2E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.edit')}</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.fullName')}</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.fullName}
                  onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
                  placeholder={t('profile.fullName')}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.nickname')}</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.nickname}
                  onChangeText={(text) => setEditForm({ ...editForm, nickname: text })}
                  placeholder={t('profile.nickname')}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.university')}</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.university}
                  onChangeText={(text) => setEditForm({ ...editForm, university: text })}
                  placeholder={t('profile.university')}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.studentNumber')}</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.studentNumber}
                  onChangeText={(text) => setEditForm({ ...editForm, studentNumber: text })}
                  placeholder={t('profile.studentNumber')}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.majorLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.major}
                  onChangeText={(text) => setEditForm({ ...editForm, major: text })}
                  placeholder={t('profile.majorLabel')}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        transparent
        visible={showLogoutConfirm}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModalContent}>
            <View style={styles.logoutModalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            </View>
            <Text style={styles.logoutModalTitle}>Signed out successfully!</Text>
            <Text style={styles.logoutModalSubtitle}>Redirecting to login...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E7E7E7',
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E7E7',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  verifiedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F3F2E',
  },
  userNickname: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  universityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  universityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E7E7',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F3F2E',
    letterSpacing: -0.2,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoItemLast: {
    marginBottom: 0,
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8A8A8A',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  addMajorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addMajorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F3F2E',
    letterSpacing: -0.2,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  languageValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  languageOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  languageOptionRowSelected: {
    backgroundColor: '#F0F9F4',
  },
  languageOptionRowText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  languageOptionRowTextSelected: {
    color: '#0F3F2E',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F1DCDC',
    gap: 8,
    height: 50,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#C64545',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
    padding: 20,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontWeight: '400',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
    letterSpacing: -0.2,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  logoutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  logoutModalIcon: {
    marginBottom: 14,
  },
  logoutModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  logoutModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default MyProfilePage;
