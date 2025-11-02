/**
 * Authentication and User-related types
 */

export interface User {
  uid: string;
  email: string;
  name?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  nickname: string;
  university: string;
  createdAt: Date;
  updatedAt: Date;
  onboardingCompleted: boolean;
  enrolledClasses: string[];
}

export interface OnboardingData {
  fullName: string;
  nickname: string;
  university: string;
}

