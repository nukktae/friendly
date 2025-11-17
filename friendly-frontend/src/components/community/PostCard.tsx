import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommunityPost } from '@/src/services/community/communityService';
import { CommentSection } from './CommentSection';

interface PostCardProps {
  post: CommunityPost;
  isLiked: boolean;
  showComments: boolean;
  commentInput: string;
  postingComment: boolean;
  isOwnPost: boolean;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentChange: (text: string) => void;
  onAddComment: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  formatTimestamp: (timestamp: any) => string;
  getImageUrl: (imageUrl: string | null | undefined) => string | null;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isLiked,
  showComments,
  commentInput,
  postingComment,
  isOwnPost,
  onLike,
  onToggleComments,
  onCommentChange,
  onAddComment,
  onEdit,
  onDelete,
  formatTimestamp,
  getImageUrl,
}) => {
  const postId = post.id || post.postId || '';
  const imageUrl = getImageUrl(post.imageUrl);

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <AvatarWithInitials
          src={post.author.avatar}
          name={post.author.name}
          size={44}
        />
        
        <View style={styles.postAuthorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author.name}
            </Text>
            <View style={styles.authorActions}>
              <View style={styles.postCategoryChip}>
                <Text style={styles.postCategoryChipText}>
                  {post.category}
                </Text>
              </View>
              {isOwnPost && (
                <View style={styles.postMenu}>
                  {onEdit && (
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={onEdit}
                    >
                      <Ionicons name="create-outline" size={18} color="#666" />
                    </TouchableOpacity>
                  )}
                  {onDelete && (
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={onDelete}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.metaRow}>
            {post.author.university && (
              <>
                <Ionicons name="school-outline" size={12} color="#9ca3af" />
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
      <Text style={styles.postContent}>{post.content}</Text>

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
          onPress={onLike}
          style={styles.actionButton}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={20} 
            color={isLiked ? "#ef4444" : "#666"} 
          />
          <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
            {post.likesCount || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onToggleComments}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments Section */}
      {showComments && (
        <CommentSection
          post={post}
          commentInput={commentInput}
          postingComment={postingComment}
          onCommentChange={onCommentChange}
          onAddComment={onAddComment}
          formatTimestamp={formatTimestamp}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  authorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  authorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  postCategoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#000',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#999',
  },
  postContent: {
    fontSize: 15,
    color: '#000',
    lineHeight: 24,
    marginBottom: 16,
  },
  postImageContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f8f8f8',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  actionTextActive: {
    color: '#ef4444',
  },
});

