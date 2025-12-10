import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { uploadPDF } from '@/src/services/pdf/pdfService';
import { useApp } from '@/src/context/AppContext';

interface PDFUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  classId?: string;
  userId: string;
}

export function PDFUploadModal({
  visible,
  onClose,
  onSuccess,
  classId,
  userId,
}: PDFUploadModalProps) {
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(result);
        // Set default title from filename
        if (!title.trim()) {
          const filename = file.name.replace(/\.pdf$/i, '');
          setTitle(filename);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || selectedFile.canceled || !selectedFile.assets || selectedFile.assets.length === 0) {
      Alert.alert('Error', 'Please select a PDF file');
      return;
    }

    const file = selectedFile.assets[0];
    
    // Validate file size (50MB limit)
    if (file.size && file.size > 50 * 1024 * 1024) {
      Alert.alert('Error', 'File size exceeds 50MB limit');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadPDF(file.uri, userId, {
        title: title.trim() || file.name.replace(/\.pdf$/i, ''),
        classId,
      });

      // Reset form
      setTitle('');
      setSelectedFile(null);
      setUploadProgress(0);

      Alert.alert('Success', 'PDF uploaded successfully', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess?.();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      
      // Extract error message
      let errorMessage = error.message || 'Failed to upload PDF';
      
      // Provide more helpful messages for specific error types
      if (errorMessage.includes('bucket') || errorMessage.includes('Storage')) {
        errorMessage = `Storage Configuration Error\n\n${errorMessage}\n\nPlease contact support or check backend configuration.`;
      } else if (errorMessage.includes('Permission denied') || errorMessage.includes('403')) {
        errorMessage = `Permission Denied\n\n${errorMessage}\n\nPlease check your account permissions.`;
      } else if (errorMessage.includes('does not exist') || errorMessage.includes('404')) {
        errorMessage = `Storage Not Found\n\n${errorMessage}\n\nPlease verify Firebase Storage is enabled.`;
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setTitle('');
      setSelectedFile(null);
      setUploadProgress(0);
      onClose();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload PDF</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isUploading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* File Selection */}
            <TouchableOpacity
              style={styles.filePicker}
              onPress={handlePickDocument}
              disabled={isUploading}
            >
              <Ionicons name="document-attach" size={32} color="#6B7C32" />
              <Text style={styles.filePickerText}>
                {selectedFile && !selectedFile.canceled && selectedFile.assets
                  ? selectedFile.assets[0].name
                  : 'Select PDF File'}
              </Text>
              {selectedFile && !selectedFile.canceled && selectedFile.assets && (
                <Text style={styles.fileSize}>
                  {formatFileSize(selectedFile.assets[0].size)}
                </Text>
              )}
            </TouchableOpacity>

            {/* Title Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter PDF title"
                value={title}
                onChangeText={setTitle}
                editable={!isUploading}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Upload Progress */}
            {isUploading && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color="#6B7C32" />
                <Text style={styles.progressText}>Uploading PDF...</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isUploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.uploadButton,
                  (!selectedFile || selectedFile.canceled || isUploading) && styles.uploadButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={!selectedFile || selectedFile.canceled || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  filePicker: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  filePickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 14,
    color: '#6b7280',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#0369a1',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  uploadButton: {
    backgroundColor: '#6B7C32',
  },
  uploadButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

