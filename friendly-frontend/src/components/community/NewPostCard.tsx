import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface NewPostCardProps {
  content: string;
  category: string;
  categories: string[];
  posting: boolean;
  imageUri?: string | null;
  onContentChange: (text: string) => void;
  onCategoryChange: (category: string) => void;
  onImageChange: (uri: string | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const NewPostCard: React.FC<NewPostCardProps> = ({
  content,
  category,
  categories,
  posting,
  imageUri,
  onContentChange,
  onCategoryChange,
  onImageChange,
  onSubmit,
  onCancel,
}) => {
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageChange(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
  };

  return (
    <View style={styles.newPostCard}>
      <Text style={styles.newPostTitle}>Create Post</Text>
      
      <TextInput
        placeholder="What's on your mind?"
        placeholderTextColor="#9CA3AF"
        value={content}
        onChangeText={onContentChange}
        multiline
        numberOfLines={4}
        style={styles.newPostInput}
      />
      
      {/* Image Preview */}
      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={handleRemoveImage}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Actions Row */}
      <View style={styles.bottomActions}>
        {/* Category Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.filter(c => c !== 'All').map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                category === cat && styles.categoryChipActive
              ]}
              onPress={() => onCategoryChange(cat)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.categoryChipText,
                category === cat && styles.categoryChipTextActive
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickImage}
            disabled={posting}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={20} color={imageUri ? "#111827" : "#9CA3AF"} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onCancel}
            style={styles.cancelButton}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onSubmit}
            style={[styles.postButton, (!content.trim() || posting) && styles.postButtonDisabled]}
            disabled={!content.trim() || posting}
            activeOpacity={0.8}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  newPostCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  newPostTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  newPostInput: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontWeight: '400',
    lineHeight: 20,
  },
  bottomActions: {
    gap: 10,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    paddingRight: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  postButton: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
});

