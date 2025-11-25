import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { useApp } from '@/src/context/AppContext';
import { ENV } from '@/src/config/env';
import {
  CommunityPost,
  addComment,
  getPost,
  toggleLike,
} from '@/src/services/community/communityService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface PostDetailScreenProps {
  postId: string;
  onBack: () => void;
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return 'Just now';
  }
};

// Helper function to get image URL
const getImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  const baseUrl = ENV.API_BASE || 'http://localhost:4000';
  return `${baseUrl}${imageUrl}`;
};

const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ postId, onBack }) => {
  const { user } = useApp();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPost(postId);
      setPost(response.post);
    } catch (error: any) {
      console.error('Error loading post:', error);
      setError(error.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user?.uid || !post) return;

    try {
      const result = await toggleLike(postId, user.uid);
      setPost({
        ...post,
        likes: result.isLiked
          ? [...(post.likes || []), user.uid]
          : (post.likes || []).filter(id => id !== user.uid),
        likesCount: result.likesCount,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to like post');
    }
  };

  const handleAddComment = async () => {
    if (!user?.uid || !commentInput.trim()) return;

    try {
      setPostingComment(true);
      await addComment(postId, {
        userId: user.uid,
        content: commentInput.trim(),
      });
      setCommentInput('');
      // Reload post to get updated comments
      await loadPost();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  };

  const isLiked = post && user?.uid ? (post.likes || []).includes(user.uid) : false;
  const imageUrl = post ? getImageUrl(post.imageUrl) : null;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onBack} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onBack} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.errorText}>{error || 'Post not found'}</Text>
          <TouchableOpacity onPress={loadPost} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Post Author */}
        <View style={styles.postAuthor}>
          <AvatarWithInitials
            src={post.author.avatar}
            name={post.author.name}
            size={44}
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{post.category}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              {post.author.university && (
                <>
                  <Ionicons name="school-outline" size={11} color="#9CA3AF" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {post.author.university}
                  </Text>
                  <View style={styles.metaDot} />
                </>
              )}
              <Text style={styles.metaText}>{formatTimestamp(post.createdAt)}</Text>
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

        {/* Post Stats */}
        <View style={styles.postStats}>
          <TouchableOpacity onPress={handleLike} style={styles.statButton}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#EF4444' : '#6B7280'}
            />
            <Text style={[styles.statText, isLiked && styles.statTextActive]}>
              {post.likesCount || 0} {(post.likesCount || 0) === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statButton}>
            <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
            <Text style={styles.statText}>
              {post.commentsCount || 0} {(post.commentsCount || 0) === 1 ? 'comment' : 'comments'}
            </Text>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          
          {(post.comments || []).length === 0 ? (
            <View style={styles.noCommentsContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="#D1D5DB" />
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts!</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {(post.comments || []).map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <AvatarWithInitials
                    src={comment.author.avatar}
                    name={comment.author.name}
                    size={36}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                    <Text style={styles.commentTime}>
                      {formatTimestamp(comment.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {/* Bottom spacing for input */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Comment Input - Fixed at bottom */}
      <View style={styles.commentInputWrapper}>
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#9CA3AF"
            value={commentInput}
            onChangeText={setCommentInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentInput.trim() || postingComment) && styles.sendButtonDisabled,
            ]}
            onPress={handleAddComment}
            disabled={postingComment || !commentInput.trim()}
          >
            {postingComment ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  postAuthor: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
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
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  postImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F3F4F6',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statTextActive: {
    color: '#EF4444',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  commentsSection: {
    flex: 1,
  },
  commentsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  noCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noCommentsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  commentsList: {
    gap: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 4,
  },
  commentInputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default PostDetailScreen;

