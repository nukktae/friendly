import { ENV } from '../../config/env';
import { Platform } from 'react-native';

const BASE_URL = ENV.API_BASE || 'http://localhost:4000';

export interface CommunityPost {
  id: string;
  postId?: string; // Some APIs return postId instead of id
  author: {
    userId: string;
    name: string;
    avatar: string | null;
    university: string;
    country: string;
  };
  content: string;
  category: string;
  imageUrl?: string | null;
  likes: string[];
  comments: Array<{
    id: string;
    author: {
      userId: string;
      name: string;
      avatar: string | null;
      university: string;
    };
    content: string;
    createdAt: any;
  }>;
  likesCount: number;
  commentsCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface CreatePostData {
  userId: string;
  content: string;
  category?: string;
  imageUri?: string; // Optional image URI for upload
}

export interface VerificationStatus {
  success: boolean;
  schoolVerified: boolean;
  university: string | null;
}

export interface VerifySchoolEmailData {
  userId: string;
  schoolEmail: string;
  university?: string;
}

export interface VerifySchoolEmailResponse {
  success: boolean;
  message: string;
  schoolVerified?: boolean;
  schoolEmail?: string;
  university?: string;
}

/**
 * Check if user is school verified
 */
export async function checkSchoolVerification(userId: string): Promise<VerificationStatus> {
  const response = await fetch(`${BASE_URL}/api/community/verify/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check verification');
  }

  return response.json();
}

/**
 * Verify school email
 */
export async function verifySchoolEmail(data: VerifySchoolEmailData): Promise<VerifySchoolEmailResponse> {
  const response = await fetch(`${BASE_URL}/api/community/verify-school-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Failed to verify school email');
  }

  return response.json();
}

/**
 * Create a new community post (with optional image upload)
 */
export async function createPost(data: CreatePostData): Promise<{ success: boolean; postId: string; post: CommunityPost }> {
  // If image is provided, use FormData for multipart upload
  if (data.imageUri) {
    const formData = new FormData();
    
    // Extract filename from URI
    let filename = data.imageUri.split('/').pop() || `post_${Date.now()}.jpg`;
    filename = filename.split('?')[0];
    
    // Determine file extension and MIME type
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const type = mimeTypeMap[extension] || 'image/jpeg';
    
    if (!filename.includes('.')) {
      filename = `${filename}.${extension}`;
    }

    // Handle web vs native platforms
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(data.imageUri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type });
        formData.append('image', file);
      } catch (error) {
        console.error('Error converting image to blob:', error);
        formData.append('image', data.imageUri as any);
      }
    } else {
      const fileData: any = {
        uri: data.imageUri,
        type: type,
        name: filename,
      };
      formData.append('image', fileData);
    }

    // Add other fields
    formData.append('userId', data.userId);
    formData.append('content', data.content);
    if (data.category) {
      formData.append('category', data.category);
    }

    const response = await fetch(`${BASE_URL}/api/community/posts`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let fetch set it automatically with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create post');
    }

    return response.json();
  }

  // No image - use JSON
  const response = await fetch(`${BASE_URL}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: data.userId,
      content: data.content,
      category: data.category,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create post');
  }

  return response.json();
}

/**
 * Get all community posts with optional filters
 */
export async function getPosts(filters?: {
  category?: string;
  university?: string;
  userId?: string;
  limit?: number;
}): Promise<{ success: boolean; posts: CommunityPost[]; count: number }> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.university) params.append('university', filters.university);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${BASE_URL}/api/community/posts${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch posts');
  }

  return response.json();
}

/**
 * Get a specific post by ID
 */
export async function getPost(postId: string): Promise<{ success: boolean; post: CommunityPost }> {
  const response = await fetch(`${BASE_URL}/api/community/posts/${postId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch post');
  }

  return response.json();
}

/**
 * Update a post (with optional image upload)
 */
export async function updatePost(
  postId: string,
  data: { userId: string; content?: string; category?: string; imageUri?: string; removeImage?: boolean }
): Promise<{ success: boolean; postId: string; post: CommunityPost }> {
  // If image is provided, use FormData for multipart upload
  if (data.imageUri) {
    const formData = new FormData();
    
    // Extract filename from URI
    let filename = data.imageUri.split('/').pop() || `post_${Date.now()}.jpg`;
    filename = filename.split('?')[0];
    
    // Determine file extension and MIME type
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const type = mimeTypeMap[extension] || 'image/jpeg';
    
    if (!filename.includes('.')) {
      filename = `${filename}.${extension}`;
    }

    // Handle web vs native platforms
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(data.imageUri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type });
        formData.append('image', file);
      } catch (error) {
        console.error('Error converting image to blob:', error);
        formData.append('image', data.imageUri as any);
      }
    } else {
      const fileData: any = {
        uri: data.imageUri,
        type: type,
        name: filename,
      };
      formData.append('image', fileData);
    }

    // Add other fields
    formData.append('userId', data.userId);
    if (data.content !== undefined) {
      formData.append('content', data.content);
    }
    if (data.category !== undefined) {
      formData.append('category', data.category);
    }
    if (data.removeImage) {
      formData.append('removeImage', 'true');
    }

    const response = await fetch(`${BASE_URL}/api/community/posts/${postId}`, {
      method: 'PATCH',
      body: formData,
      // Don't set Content-Type header - let fetch set it automatically with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update post');
    }

    return response.json();
  }

  // No image - use JSON
  const body: any = {
    userId: data.userId,
  };
  if (data.content !== undefined) body.content = data.content;
  if (data.category !== undefined) body.category = data.category;
  if (data.removeImage) body.removeImage = 'true';

  const response = await fetch(`${BASE_URL}/api/community/posts/${postId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update post');
  }

  return response.json();
}

/**
 * Delete a post
 */
export async function deletePost(postId: string, userId: string): Promise<{ success: boolean; postId: string }> {
  const response = await fetch(`${BASE_URL}/api/community/posts/${postId}?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete post');
  }

  return response.json();
}

/**
 * Toggle like on a post
 */
export async function toggleLike(
  postId: string,
  userId: string
): Promise<{ success: boolean; postId: string; isLiked: boolean; likesCount: number }> {
  const response = await fetch(`${BASE_URL}/api/community/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to toggle like');
  }

  return response.json();
}

/**
 * Add a comment to a post
 */
export async function addComment(
  postId: string,
  data: { userId: string; content: string }
): Promise<{ success: boolean; postId: string; comment: any }> {
  const response = await fetch(`${BASE_URL}/api/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add comment');
  }

  return response.json();
}

