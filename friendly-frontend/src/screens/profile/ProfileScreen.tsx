import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MyProfilePageProps {
  onBack: () => void;
}

const MyProfilePage: React.FC<MyProfilePageProps> = ({
  onBack,
}) => {
  const { user, logout, isAuthenticated, resetTutorials, startTutorial } = useApp();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track mounted state and cleanup
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Redirect to login if user becomes unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      // Show confirmation modal briefly
      setShowLogoutConfirm(true);
      
      // Wait for logout to complete
      await logout();
      
      // Navigate to login screen after logout
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          setShowLogoutConfirm(false);
          router.replace('/login');
        }
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutConfirm(false);
    }
  };

  const profileOptions = [
    { 
      icon: "create-outline", 
      label: "Edit Profile", 
      action: () => console.log("Edit Profile")
    },
    { 
      icon: "heart-outline", 
      label: "Favorites", 
      action: () => console.log("Favorites")
    },
    { 
      icon: "settings-outline", 
      label: "Settings", 
      action: () => console.log("Settings")
    },
    { 
      icon: "bulb-outline", 
      label: "Reset Tutorials (Debug)", 
      action: async () => {
        await resetTutorials();
        alert('Tutorials reset! Restart the app to see them again.');
      }
    },
    { 
      icon: "play-circle-outline", 
      label: "Show Tutorial Again (Debug)", 
      action: () => startTutorial('dashboard', true)
    },
    { 
      icon: "help-circle-outline", 
      label: "Help & Support", 
      action: () => console.log("Help")
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="white" />
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={12} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.name || 'User'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'user@example.com'}
            </Text>
            <View style={styles.memberSince}>
              <View style={styles.statusDot} />
              <Text style={styles.memberText}>
                Member since 2024
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          {profileOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={option.action}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color="#000" 
                />
                <Text style={styles.menuItemText}>
                  {option.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.signOutButton}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#000" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        transparent={true}
        visible={showLogoutConfirm}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-outline" size={28} color="#000" />
            </View>
            <Text style={styles.modalTitle}>
              Signed out successfully!
            </Text>
            <Text style={styles.modalSubtitle}>
              Redirecting to login...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  memberText: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    marginHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default MyProfilePage;