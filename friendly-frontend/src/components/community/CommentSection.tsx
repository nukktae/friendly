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
          placeholderTextColor="#999"
          value={commentInput}
          onChangeText={onCommentChange}
          multiline
        />
        <TouchableOpacity
          style={styles.commentSendButton}
          onPress={onAddComment}
          disabled={postingComment || !commentInput.trim()}
        >
          {postingComment ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="send" size={18} color="#000" />
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
              <Text style={styles.commentAuthor}>{comment.author.name}</Text>
              <Text style={styles.commentText}>{comment.content}</Text>
              <Text style={styles.commentTime}>
                {formatTimestamp(comment.createdAt)}
              </Text>
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
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 100,
  },
  commentSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

