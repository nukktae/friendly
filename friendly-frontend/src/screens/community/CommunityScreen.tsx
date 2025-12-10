import { useApp } from '@/src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  CommunityPost,
  checkSchoolVerification,
  createPost,
  deletePost,
  getPosts,
  toggleLike,
  updatePost,
  verifySchoolEmail,
} from '@/src/services/community/communityService';
import { ENV } from '@/src/config/env';
import { VerificationModal } from '@/src/components/modules/community/VerificationModal';
import { FilterBar } from '@/src/components/modules/community/FilterBar';
import { NewPostCard } from '@/src/components/modules/community/NewPostCard';
import { PostCard } from '@/src/components/modules/community/PostCard';

interface CommunityPageProps {}

const CATEGORIES = [
  'All',
  'General',
  'Study Tips',
  'Study Groups',
  'Success Stories',
  'Research',
  'Community Projects',
];

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
  // If it's a relative path, construct full URL
  const baseUrl = ENV.API_BASE || 'http://localhost:4000';
  return `${baseUrl}${imageUrl}`;
};

const CommunityPage: React.FC<CommunityPageProps> = () => {
  const { user, userProfile, loadUserProfile } = useApp();
  const handleBack = () => {
    router.push('/');
  };
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verification state
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // New post
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [newPostImageUri, setNewPostImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  
  // Edit post
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostCategory, setEditPostCategory] = useState('General');
  const [editPostImageUri, setEditPostImageUri] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Check verification status
  useEffect(() => {
    if (user?.uid) {
      checkVerificationStatus();
    } else {
      setCheckingVerification(false);
      setLoading(false);
    }
  }, [user?.uid]);

  // Load posts
  useEffect(() => {
    if (isVerified && user?.uid) {
      loadPosts();
    }
  }, [isVerified, user?.uid, selectedCategory]);

  const checkVerificationStatus = async () => {
    if (!user?.uid) {
      setCheckingVerification(false);
      setLoading(false);
      return;
    }
    
    try {
      setCheckingVerification(true);
      setLoading(true);
      console.log('[Community] Checking verification for user:', user.uid);
      const status = await checkSchoolVerification(user.uid);
      console.log('[Community] Verification status:', status);
      setIsVerified(status.schoolVerified || false);
      if (!status.schoolVerified) {
        console.log('[Community] User not verified, showing modal');
        setShowVerificationModal(true);
      } else {
        console.log('[Community] User is verified');
      }
    } catch (error: any) {
      console.error('[Community] Error checking verification:', error);
      // If user profile doesn't exist (404), still allow them to verify
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.log('[Community] User profile not found, allowing verification');
        setIsVerified(false);
        setShowVerificationModal(true);
      } else {
        setError(error.message || 'Failed to check verification status');
        // Still show the modal if there's an error, so user can try to verify
        setShowVerificationModal(true);
      }
    } finally {
      setCheckingVerification(false);
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (email: string) => {
    if (!user?.uid) return;

    try {
      setVerifying(true);
      const result = await verifySchoolEmail({
        userId: user.uid,
        schoolEmail: email,
        university: userProfile?.university,
      });
      
      if (result.success) {
        setIsVerified(true);
        setShowVerificationModal(false);
        await loadUserProfile(); // Refresh user profile
        await loadPosts(); // Load posts after verification
        Alert.alert('Success', result.message || 'School email verified successfully!');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Failed to verify school email. Please check your email address.');
      throw error;
    } finally {
      setVerifying(false);
    }
  };

  const loadPosts = async () => {
    if (!user?.uid) return;
    
    try {
      setRefreshing(true);
      setError(null);
      
      const filters: any = {};
      if (selectedCategory !== 'All') {
        filters.category = selectedCategory;
      }
      
      const response = await getPosts(filters);
      setPosts(response.posts || []);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      setError(error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user?.uid || !newPostContent.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }

    try {
      setPosting(true);
      const response = await createPost({
        userId: user.uid,
        content: newPostContent.trim(),
        category: newPostCategory,
        imageUri: newPostImageUri || undefined,
      });
      
      // Add the new post to the list
      setPosts([response.post, ...posts]);
      setNewPostContent('');
      setNewPostImageUri(null);
      setShowNewPost(false);
      Alert.alert('Success', 'Post created successfully!');
    } catch (error: any) {
      if (error.message?.includes('verification')) {
        Alert.alert('Verification Required', 'You need to verify your school email to create posts.');
        setShowVerificationModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to create post');
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to like posts');
      return;
    }

    try {
      const result = await toggleLike(postId, user.uid);
      
      // Update the post in the list
      setPosts(posts.map(post => {
        const id = post.id || post.postId || '';
        if (id === postId) {
          return {
            ...post,
            likes: result.isLiked 
              ? [...(post.likes || []), user.uid]
              : (post.likes || []).filter(id => id !== user.uid),
            likesCount: result.likesCount,
          };
        }
        return post;
      }));
    } catch (error: any) {
      if (error.message?.includes('verification')) {
        Alert.alert('Verification Required', 'You need to verify your school email to like posts.');
        setShowVerificationModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to like post');
      }
    }
  };

  const handleNavigateToPost = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPostId(post.id || post.postId || '');
    setEditPostContent(post.content);
    setEditPostCategory(post.category);
    setEditPostImageUri(null); // Don't preload existing image for edit
  };

  const handleUpdatePost = async () => {
    if (!user?.uid || !editingPostId || !editPostContent.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }

    try {
      setUpdating(true);
      const response = await updatePost(editingPostId, {
        userId: user.uid,
        content: editPostContent.trim(),
        category: editPostCategory,
        imageUri: editPostImageUri || undefined,
      });
      
      // Update the post in the list
      setPosts(posts.map(post => {
        const id = post.id || post.postId || '';
        if (id === editingPostId) {
          return response.post;
        }
        return post;
      }));
      
      setEditingPostId(null);
      setEditPostContent('');
      setEditPostCategory('General');
      setEditPostImageUri(null);
      Alert.alert('Success', 'Post updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update post');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user?.uid) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId, user.uid);
              // Remove post from list
              setPosts(posts.filter(post => {
                const id = post.id || post.postId || '';
                return id !== postId;
              }));
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const isPostLiked = (post: CommunityPost): boolean => {
    if (!user?.uid) return false;
    return (post.likes || []).includes(user.uid);
  };

  const filteredPosts = posts.filter(post => {
    const categoryMatch = selectedCategory === 'All' || post.category === selectedCategory;
    return categoryMatch;
  });

  // Show loading state only while checking verification
  if (checkingVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        {isVerified && (
        <TouchableOpacity 
          onPress={() => setShowNewPost(!showNewPost)}
          style={styles.newPostButton}
          activeOpacity={0.7}
        >
          <Ionicons name="add-outline" size={18} color="#0F3F2E" />
        </TouchableOpacity>
        )}
      </View>

      {/* Verification Modal */}
      <VerificationModal
        visible={showVerificationModal && !isVerified}
        onClose={() => {
          setShowVerificationModal(false);
          // Don't prevent user from closing modal
        }}
        onVerify={handleVerifyEmail}
        verifying={verifying}
      />

      {/* Filter Bar */}
      {isVerified && (
        <FilterBar
          selectedCategory={selectedCategory}
          categories={CATEGORIES}
          onCategorySelect={setSelectedCategory}
          showDropdown={showCategoryDropdown}
          onToggleDropdown={() => setShowCategoryDropdown(!showCategoryDropdown)}
        />
      )}

      {/* New Post Card */}
      {showNewPost && isVerified && (
        <NewPostCard
          content={newPostContent}
          category={newPostCategory}
          categories={CATEGORIES}
          posting={posting}
          imageUri={newPostImageUri}
          onContentChange={setNewPostContent}
          onCategoryChange={setNewPostCategory}
          onImageChange={setNewPostImageUri}
          onSubmit={handleCreatePost}
          onCancel={() => {
            setShowNewPost(false);
            setNewPostContent('');
            setNewPostImageUri(null);
          }}
        />
      )}

      {/* Edit Post Card */}
      {editingPostId && isVerified && (
        <NewPostCard
          content={editPostContent}
          category={editPostCategory}
          categories={CATEGORIES}
          posting={updating}
          imageUri={editPostImageUri}
          onContentChange={setEditPostContent}
          onCategoryChange={setEditPostCategory}
          onImageChange={setEditPostImageUri}
          onSubmit={handleUpdatePost}
          onCancel={() => {
            setEditingPostId(null);
            setEditPostContent('');
            setEditPostCategory('General');
            setEditPostImageUri(null);
          }}
        />
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadPosts}>
            <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* Posts Feed */}
      {isVerified ? (
      <ScrollView 
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadPosts}
              tintColor="#000"
            />
          }
      >
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Share something with your community!
            </Text>
          </View>
        ) : (
            filteredPosts.map((post) => {
              const postId = post.id || post.postId || '';
              const liked = isPostLiked(post);
              const isOwnPost = user?.uid === post.author.userId;
              
              return (
                <PostCard
                  key={postId}
                  post={post}
                  isLiked={liked}
                  isOwnPost={isOwnPost}
                  onLike={() => handleLike(postId)}
                  onNavigate={handleNavigateToPost}
                  onEdit={isOwnPost ? () => handleEditPost(post) : undefined}
                  onDelete={isOwnPost ? () => handleDeletePost(postId) : undefined}
                  formatTimestamp={formatTimestamp}
                  getImageUrl={getImageUrl}
                />
              );
            })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Verification Required</Text>
          <Text style={styles.emptyText}>
            Please verify your school email to access the community
          </Text>
          {!showVerificationModal && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => setShowVerificationModal(true)}
            >
              <Text style={styles.verifyButtonText}>Verify School Email</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.5,
  },
  newPostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 0.5,
    borderBottomColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    backgroundColor: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  verifyButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

export default CommunityPage;
