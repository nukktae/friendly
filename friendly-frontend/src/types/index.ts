/**
 * Centralized type definitions for the mobile app
 * Types are now organized by domain for better maintainability
 */

// Re-export all types from domain-specific files
export * from './auth.types';
export * from './class.types';
export * from './classResources.types';

// Note: As the app grows, consider adding more domain-specific type files:
// - schedule.types.ts
// - community.types.ts
// - tutorial.types.ts
