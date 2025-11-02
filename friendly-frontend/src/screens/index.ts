/**
 * Barrel export for all screen components
 * This allows cleaner imports: import { LoginScreen, SignupScreen } from '@/src/screens'
 */

// Auth screens
export { default as LoginScreen } from './auth/LoginScreen';
export { default as SignupScreen } from './auth/SignupScreen';

// Class screens
export { default as ClassDetailScreen } from './classes/ClassDetailScreen';
export { default as ClassesListScreen } from './classes/ClassesListScreen';

// Community screens
export { default as CommunityScreen } from './community/CommunityScreen';

// Onboarding screens
export { default as OnboardingCompleteScreen } from './onboarding/OnboardingCompleteScreen';
export { default as OnboardingScreen } from './onboarding/OnboardingScreen';

// Profile screens
export { default as ProfileScreen } from './profile/ProfileScreen';

// Recording screens
export { default as RecordScreen } from './recording/RecordScreen';

// Schedule screens
export { default as ScheduleReviewScreen } from './schedule/ScheduleReviewScreen';
export { default as ScheduleScreen } from './schedule/ScheduleScreen';

// Assignment screens
export { default as AssignmentDetailScreen } from './assignments/AssignmentDetailScreen';

