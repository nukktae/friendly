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
          size={36}
        />
        
        <View style={styles.postAuthorInfo}>
          <View style={styles.authorRow}>
            <View style={styles.authorNameContainer}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author.name}
              </Text>
              <View style={styles.postCategoryChip}>
                <Text style={styles.postCategoryChipText}>
                  {post.category}
                </Text>
              </View>
            </View>
            {isOwnPost && (
              <View style={styles.postMenu}>
                {onEdit && (
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={handleEditPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={15} color="#6B7280" />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={handleDeletePress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.metaRow}>
            {post.author.university && (
              <>
                <Ionicons name="school-outline" size={10} color="#9CA3AF" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {post.author.university}
                </Text>
                <View style={styles.metaDot} />
              </>
            )}
            <Text style={styles.metaText}>
              {formatTimestamp(post.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent} numberOfLines={3}>
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
            size={16} 
            color={isLiked ? "#EF4444" : "#9CA3AF"} 
          />
          {(post.likesCount || 0) > 0 && (
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {post.likesCount || 0}
            </Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
          {(post.commentsCount || 0) > 0 && (
            <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  postAuthorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  postMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuButton: {
    padding: 4,
  },
  postCategoryChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  postCategoryChipText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D1D5DB',
  },
  postContent: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  postImageContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#FAFAFA',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: -0.2,
  },
  actionTextActive: {
    color: '#EF4444',
  },
});

