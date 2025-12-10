import { ENV } from '@/src/config/env';
import { isWeb } from '@/src/lib/platform';

const API_BASE = ENV.API_BASE || 'http://localhost:4000';

export interface Profile {
  uid: string;
  email: string;
  fullName: string;
  nickname: string;
  university: string;
  profilePicture?: string;
  schoolVerified?: boolean;
  schoolEmail?: string;
  studentNumber?: string;
  major?: string;
  enrolledClasses?: string[];
  onboardingCompleted?: boolean;
  createdAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | Date;
  updatedAt?: {
    _seconds: number;
    _nanoseconds: number;
  } | Date;
}

export interface UpdateProfileData {
  fullName?: string;
  nickname?: string;
  university?: string;
  studentNumber?: string;
  major?: string;
}

/**
 * Get user profile
 * Returns null if profile doesn't exist
 */
export async function getProfile(uid: string): Promise<Profile | null> {
  const response = await fetch(`${API_BASE}/api/users/${uid}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null; // Profile doesn't exist
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch profile');
  }

  const data = await response.json();
  return data.profile;
}

/**
 * Create user profile
 */
export async function createProfile(
  uid: string,
  email: string,
  profileData?: {
    fullName?: string;
    nickname?: string;
    university?: string;
  }
): Promise<Profile> {
  const response = await fetch(`${API_BASE}/api/users/${uid}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      fullName: profileData?.fullName || '',
      nickname: profileData?.nickname || '',
      university: profileData?.university || '',
      onboardingCompleted: false,
      enrolledClasses: [],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create profile');
  }

  const data = await response.json();
  return data.profile;
}

/**
 * Update user profile
 */
export async function updateProfile(
  uid: string,
  updates: UpdateProfileData
): Promise<Profile> {
  const response = await fetch(`${API_BASE}/api/users/${uid}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  const data = await response.json();
  return data.profile;
}

/**
 * Upload profile picture
 */
export async function uploadProfilePicture(
  uid: string,
  imageUri: string
): Promise<{ profilePictureUrl: string; profile: Profile }> {
  const formData = new FormData();
  
  // Extract filename from URI - handle both file:// and content:// URIs
  let filename = imageUri.split('/').pop() || `profile_${Date.now()}.jpg`;
  
  // Remove query parameters if present
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
  
  // Ensure filename has extension
  if (!filename.includes('.')) {
    filename = `${filename}.${extension}`;
  }

  // Handle web vs native platforms differently
  if (isWeb()) {
    // On web, we need to fetch the image and convert it to a Blob
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new File([blob], filename, { type });
      formData.append('picture', file);
    } catch (error) {
      console.error('Error converting image to blob:', error);
      // Fallback: try to use the URI directly (might work for some cases)
      formData.append('picture', imageUri as any);
    }
  } else {
    // On React Native (iOS/Android), FormData requires specific structure
    // The file object must have uri, type, and name properties
    const fileData: any = {
      uri: imageUri,
      type: type,
      name: filename,
    };
    formData.append('picture', fileData);
  }

  console.log('Uploading profile picture:', { uid, filename, type, platform: isWeb() ? 'web' : 'native' });

  const response = await fetch(`${API_BASE}/api/users/${uid}/profile/picture`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - let fetch set it automatically with boundary
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to upload profile picture' }));
    console.error('Upload error:', error);
    throw new Error(error.error || 'Failed to upload profile picture');
  }

  const data = await response.json();
  return {
    profilePictureUrl: data.pictureUrl || data.profilePictureUrl,
    profile: data.profile,
  };
}

/**
 * Update nickname
 */
export async function updateNickname(
  uid: string,
  nickname: string
): Promise<Profile> {
  const response = await fetch(`${API_BASE}/api/users/${uid}/profile/nickname`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nickname }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update nickname');
  }

  const data = await response.json();
  return data.profile;
}

/**
 * Get profile picture URL
 * Returns the full URL to the profile picture, or null if no picture exists
 */
export function getProfilePictureUrl(uid: string, profilePicture?: string): string | null {
  if (!profilePicture) {
    return null;
  }
  
  // If it's already a full URL, return it as is
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture;
  }
  
  // If it's a relative path, construct the full URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = profilePicture.startsWith('/') ? profilePicture.slice(1) : profilePicture;
  return `${API_BASE}/${cleanPath}`;
}

/**
 * Get profile picture as blob (for downloading/displaying)
 */
export async function getProfilePicture(uid: string): Promise<Blob | null> {
  try {
    const response = await fetch(`${API_BASE}/api/users/${uid}/profile/picture`, {
      method: 'GET',
    });

    if (response.status === 404) {
      return null; // No profile picture
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch profile picture');
    }

    return await response.blob();
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Sign out
 */
export async function signOut(idToken?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/signout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sign out');
  }
}

