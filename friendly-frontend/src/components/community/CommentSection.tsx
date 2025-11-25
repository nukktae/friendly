import { AvatarWithInitials } from '@/src/components/common/AvatarWithInitials';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CommunityPost } from '@/src/services/community/communityService';

interface CommentSectionProps {
  post: CommunityPost;
  commentInput: string;
  postingComment: boolean;
  onCommentChange: (text: string) => void;
  onAddComment: () => void;
  formatTimestamp: (timestamp: any) => string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  post,
  commentInput,
  postingComment,
  onCommentChange,
  onAddComment,
  formatTimestamp,
}) => {
  return (
    <View style={styles.commentsSection}>
      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor="#9CA3AF"
          value={commentInput}
          onChangeText={onCommentChange}
          multiline
        />
        <TouchableOpacity
          style={[styles.commentSendButton, (!commentInput.trim() || postingComment) && styles.commentSendButtonDisabled]}
          onPress={onAddComment}
          disabled={postingComment || !commentInput.trim()}
          activeOpacity={0.7}
        >
          {postingComment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Comments List */}
      <View style={styles.commentsList}>
        {(post.comments || []).map((comment) => (
          <View key={comment.id} style={styles.commentItem}>
            <AvatarWithInitials
              src={comment.author.avatar}
              name={comment.author.name}
              size={32}
            />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                <Text style={styles.commentTime}>
                  {formatTimestamp(comment.createdAt)}
                </Text>
              </View>
              <Text style={styles.commentText}>{comment.content}</Text>
            </View>
          </View>
        ))}
        {(!post.comments || post.comments.length === 0) && (
          <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  commentsSection: {
    marginTop: 12,
    paddingTop: 0,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 100,
    fontWeight: '400',
  },
  commentSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  noCommentsText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 14,
    fontWeight: '400',
  },
});

