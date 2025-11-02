import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface ScheduleUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string) => void;
  onGoogleCalendarImport: () => void;
}

const ScheduleUploadModal: React.FC<ScheduleUploadModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  onGoogleCalendarImport,
}) => {

  const requestPermissions = async () => {
    try {
      const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaResult.granted) {
          Alert.alert(
            'Permission Required',
            'Photo library access is required.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const pickFromGallery = async () => {
    // Close the modal first
    onClose();
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Call onImageSelected with the actual image URI
        // The AI service will use mock data for processing
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleGoogleCalendarImport = () => {
    console.log('Google Calendar import button clicked');
    onGoogleCalendarImport();
    // Don't close the modal immediately - let the parent handle it
    // The modal will be closed when the import process completes or fails
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Schedule</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.subtitle}>Choose how you'd like to add your schedule</Text>
            
            <View style={styles.options}>
              {/* Choose from Gallery */}
              <TouchableOpacity style={styles.option} onPress={pickFromGallery}>
                <View style={styles.optionIcon}>
                  <Ionicons name="images" size={24} color="#000" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Choose from Gallery</Text>
                  <Text style={styles.optionDescription}>Select an existing photo of your schedule</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>

              {/* Import from Google Calendar */}
              <TouchableOpacity style={styles.option} onPress={handleGoogleCalendarImport}>
                <View style={styles.optionIcon}>
                  <Ionicons name="calendar" size={24} color="#000" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Import from Google Calendar</Text>
                  <Text style={styles.optionDescription}>Sync your existing Google Calendar events</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34, // Safe area for iPhone
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ScheduleUploadModal;