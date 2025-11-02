import { ENV } from '@/src/config/env';
import { OnboardingData, UserProfile } from '@/src/types';

export class FirestoreService {
  // Create a new user profile
  static async createUserProfile(uid: string, email: string, onboardingData: OnboardingData): Promise<void> {
    try {
      const payload = {
        email,
        fullName: onboardingData.fullName,
        nickname: onboardingData.nickname,
        university: onboardingData.university,
        onboardingCompleted: true,
        enrolledClasses: [] as string[],
      };
      const res = await fetch(`${ENV.API_BASE}/api/users/${uid}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      console.log('User profile created successfully');
    } catch (error: any) {
      // Handle network errors gracefully - backend might not be running
      const errorMessage = error?.message || error?.toString() || '';
      const isNetworkError = errorMessage.includes('Network request failed') || 
                            errorMessage.includes('Failed to fetch') ||
                            (error instanceof TypeError && errorMessage.includes('Network'));
      
      if (isNetworkError) {
        console.log('Backend server not reachable. User profile will be created when backend is available.');
        // Still throw the error so caller can handle it, but log it less verbosely
        throw error;
      }
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Get user profile by UID
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${ENV.API_BASE}/api/users/${uid}/profile`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return {
        uid: data.uid || uid,
        email: data.email,
        fullName: data.fullName,
        nickname: data.nickname,
        university: data.university,
        createdAt: data.createdAt ? new Date(data.createdAt._seconds ? data.createdAt._seconds * 1000 : data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt._seconds ? data.updatedAt._seconds * 1000 : data.updatedAt) : new Date(),
        onboardingCompleted: !!data.onboardingCompleted,
        enrolledClasses: data.enrolledClasses || [],
      };
    } catch (error: any) {
      // Handle network errors gracefully - backend might not be running
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        console.log('Backend server not reachable. User profile will be unavailable until backend is running.');
        return null; // Return null instead of throwing to allow app to continue
      }
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const res = await fetch(`${ENV.API_BASE}/api/users/${uid}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await res.text());
      
      console.log('User profile updated successfully');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Check if user has completed onboarding
  static async checkOnboardingStatus(uid: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.onboardingCompleted || false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  // Get user's enrolled classes
  static async getUserEnrolledClasses(uid: string): Promise<string[]> {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.enrolledClasses || [];
    } catch (error) {
      console.error('Error getting enrolled classes:', error);
      return [];
    }
  }

  // Enroll user in a class
  static async enrollInClass(uid: string, classId: string): Promise<void> {
    try {
      let userProfile = await this.getUserProfile(uid);
      
      // If profile doesn't exist, initialize with just the enrolled class
      if (!userProfile) {
        // Try to get user email from auth context if available
        // For now, we'll just initialize with empty profile data
        const updatedClasses = [classId];
        
        // Use updateUserProfile which should handle creation if profile doesn't exist
        // Note: This might fail if backend requires full profile, but we'll try
        await this.updateUserProfile(uid, {
          enrolledClasses: updatedClasses
        });
        
        console.log('User enrolled in class successfully (profile initialized)');
        return;
      }

      const updatedClasses = [...(userProfile.enrolledClasses || [])];
      if (!updatedClasses.includes(classId)) {
        updatedClasses.push(classId);
      }

      await this.updateUserProfile(uid, {
        enrolledClasses: updatedClasses
      });

      console.log('User enrolled in class successfully');
    } catch (error) {
      console.error('Error enrolling in class:', error);
      // Don't throw - let the caller handle it gracefully
      // The schedule-review screen already catches and logs these errors
      throw error;
    }
  }

  // Unenroll user from a class
  static async unenrollFromClass(uid: string, classId: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const updatedClasses = userProfile.enrolledClasses.filter(id => id !== classId);

      await this.updateUserProfile(uid, {
        enrolledClasses: updatedClasses
      });

      console.log('User unenrolled from class successfully');
    } catch (error) {
      console.error('Error unenrolling from class:', error);
      throw error;
    }
  }

  // Get all users (for admin purposes - optional)
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${ENV.API_BASE}/api/users`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.map((u: any) => ({
        uid: u.uid,
        email: u.email,
        fullName: u.fullName,
        nickname: u.nickname,
        university: u.university,
        createdAt: u.createdAt ? new Date(u.createdAt._seconds ? u.createdAt._seconds * 1000 : u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt._seconds ? u.updatedAt._seconds * 1000 : u.updatedAt) : new Date(),
        onboardingCompleted: !!u.onboardingCompleted,
        enrolledClasses: u.enrolledClasses || [],
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
}
