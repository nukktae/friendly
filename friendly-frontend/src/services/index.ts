/**
 * Barrel export for all services
 * This allows cleaner imports: import { AuthService, ClassesService } from '@/src/services'
 */

// Auth service
export { AuthService } from './auth/authService';

// Calendar service
export { GoogleCalendarService } from './calendar/googleCalendarService';

// Classes service
export { ClassesService, PRODUCTS } from './classes/classesService';

// Firestore service
export { FirestoreService } from './firestore/firestoreService';

// Schedule services
export { scheduleAIService, type ScheduleItem } from './schedule/scheduleAIService';
export { default as scheduleStorageService, type UserSchedule } from './schedule/scheduleStorageService';

// Tutorial service
export { default as tutorialService, type TutorialConfig, type TutorialStep } from './tutorial/tutorialService';

