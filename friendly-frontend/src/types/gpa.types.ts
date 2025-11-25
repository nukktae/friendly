/**
 * GPA Calculator types
 */

export interface Course {
  id: string;
  name: string;
  credits: number;
  grade: string; // A, B, C, D, F or numeric (0-4.0)
  semester?: string;
  year?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SemesterData {
  semester: string; // e.g., "2025 Fall"
  courses: Course[];
  isCurrent: boolean;
}

export interface GPAData {
  userId: string;
  courses: Course[];
  totalCreditsRequired: number;
  completedRequiredCourses?: string[]; // Array of course names/codes that are checked
  completedCoreCategories?: string[]; // Array of core category keys that are checked (e.g., ['인문1', '인문2'])
  graduationRequirementsAnalysis?: any; // Graduation requirements analysis data
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestedClass {
  id: string;
  name: string;
  credits: number;
  reason: string; // Why this class is suggested
  isAI: boolean; // Whether this is an AI suggestion or manually added
  status?: 'planned' | 'taken'; // For manual suggestions
  createdAt: Date;
}

export interface GradePoint {
  grade: string;
  points: number;
}

// Standard grade point mapping
export const GRADE_POINTS: GradePoint[] = [
  { grade: 'A+', points: 4.0 },
  { grade: 'A', points: 4.0 },
  { grade: 'A-', points: 3.7 },
  { grade: 'B+', points: 3.3 },
  { grade: 'B', points: 3.0 },
  { grade: 'B-', points: 2.7 },
  { grade: 'C+', points: 2.3 },
  { grade: 'C', points: 2.0 },
  { grade: 'C-', points: 1.7 },
  { grade: 'D+', points: 1.3 },
  { grade: 'D', points: 1.0 },
  { grade: 'D-', points: 0.7 },
  { grade: 'F', points: 0.0 },
];

