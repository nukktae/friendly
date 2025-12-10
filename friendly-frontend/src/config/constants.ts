/**
 * Application-wide constants
 * These are static values used throughout the app
 */

// Theme constants (can be moved from constants/theme.ts if needed)
export const THEME_COLORS = {
  tintColorLight: '#0a7ea4',
  tintColorDark: '#fff',
} as const;

// App-wide constants
export const APP_CONSTANTS = {
  DEFAULT_TOTAL_CREDITS: 120,
  CACHE_EXPIRATION_HOURS: 24,
  DEFAULT_PAGE_SIZE: 20,
  MAX_FILE_SIZE_MB: 20,
} as const;

// API endpoints (relative paths)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    SIGNOUT: '/api/auth/signout',
    GOOGLE: '/api/auth/google',
  },
  LECTURES: {
    BASE: '/api/lectures',
    TRANSCRIBE: (id: string) => `/api/lectures/${id}/transcribe`,
    TRANSCRIBE_CHUNK: (id: string) => `/api/lectures/${id}/transcribe-chunk`,
    TRANSCRIPTS: (id: string) => `/api/lectures/${id}/transcripts`,
    SUMMARY: (transcriptionId: string) => `/api/lectures/transcription/${transcriptionId}/summary`,
    CHECKLIST: (transcriptionId: string) => `/api/lectures/transcription/${transcriptionId}/checklist`,
    CHAT: (transcriptionId: string) => `/api/lectures/transcription/${transcriptionId}/chat`,
    CHAT_GLOBAL: '/api/lectures/chat',
  },
  SCHEDULE: {
    ANALYZE_IMAGE: (userId: string) => `/api/schedule/${userId}/analyze-image`,
    SAVE: '/api/schedule/save',
  },
  COMMUNITY: {
    POSTS: '/api/community/posts',
    POST: (id: string) => `/api/community/posts/${id}`,
    VERIFY: (userId: string) => `/api/community/verify/${userId}`,
    VERIFY_SCHOOL_EMAIL: '/api/community/verify-school-email',
  },
  GPA: {
    BASE: (userId: string) => `/api/gpa/${userId}`,
    SUGGESTIONS: (userId: string) => `/api/gpa/${userId}/suggestions`,
  },
  PDFS: {
    BASE: '/api/pdfs',
    PDF: (id: string) => `/api/pdfs/${id}`,
    ANALYZE: (id: string) => `/api/pdfs/${id}/analyze`,
    ANALYZE_PAGE: (id: string) => `/api/pdfs/${id}/analyze-page`,
    CHAT: (id: string) => `/api/pdfs/${id}/chat`,
    DOWNLOAD: (id: string) => `/api/pdfs/${id}/download`,
  },
  USERS: {
    PROFILE: (uid: string) => `/api/users/${uid}/profile`,
    PROFILE_PICTURE: (uid: string) => `/api/users/${uid}/profile/picture`,
  },
  TRANSCRIBE: '/api/transcribe',
} as const;

