import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommunityPost } from '@/src/services/community/communityService';

interface PostCardProps {
  post: CommunityPost;
  isLiked: boolean;
  isOwnPost: boolean;
  onLike: () => void;
  onNavigate: (postId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  formatTimestamp: (timestamp: any) => string;
  getImageUrl: (imageUrl: string | null | undefined) => string | null;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isLiked,
  isOwnPost,
  onLike,
  onNavigate,
  onEdit,
  onDelete,
  formatTimestamp,
  getImageUrl,
}) => {
  const postId = post.id || post.postId || '';
  const imageUrl = getImageUrl(post.imageUrl);

  const handleCardPress = () => {
    onNavigate(postId);
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    onLike();
  };

  const handleEditPress = (e: any) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDeletePress = (e: any) => {
    e.stopPropagation();
    onDelete?.();
  };

  const formatDateForMeta = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${month} ${day}, ${year}`;
    } catch (error) {
      return '';
    }
  };

  const metadataText = post.author.university 
    ? `${post.author.university} · ${formatDateForMeta(post.createdAt)}`
    : formatDateForMeta(post.createdAt);

  return (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      {/* Post Header */}
      <View style={styles.postHeader}>
        <AvatarWithInitials
          src={post.author.avatar}
          name={post.author.name}
          size={40}
        />
        
        <View style={styles.postAuthorInfo}>
          <View style={styles.authorRow}>
            <View style={styles.authorNameContainer}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author.name}
              </Text>
              <View style={styles.postCategoryChip}>
                <Text style={styles.postCategoryChipText}>
                  {post.category.toUpperCase()}
                </Text>
              </View>
            </View>
            {isOwnPost && (
              <View style={styles.postMenu}>
                {onEdit && (
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={handleEditPress}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="create-outline" size={16} color="#6A6A6A" />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={handleDeletePress}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={16} color="#6A6A6A" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          {metadataText && (
            <Text style={styles.metaText} numberOfLines={1}>
              {metadataText}
            </Text>
          )}
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>
        {post.content}
      </Text>

      {/* Post Image */}
      {imageUrl && (
        <View style={styles.postImageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          onPress={handleLikePress}
          style={styles.actionButton}
          activeOpacity={0.6}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={18} 
            color={isLiked ? "#0F3F2E" : "#9CA3AF"} 
          />
          {(post.likesCount || 0) > 0 && (
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {post.likesCount || 0}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          activeOpacity={0.6}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" />
          {(post.commentsCount || 0) > 0 && (
            <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.3,
  },
  postMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  postCategoryChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F7F7F7',
  },
  postCategoryChipText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: '#555555',
  },
  metaText: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  postContent: {
    fontSize: 15,
    color: '#111111',
    lineHeight: 22,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  postImageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F7F7F7',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8A8A8A',
    letterSpacing: -0.2,
  },
  actionTextActive: {
    color: '#0F3F2E',
  },
});

