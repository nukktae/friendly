import { Course, GRADE_POINTS } from '@/src/types/gpa.types';

/**
 * Calculate GPA from a list of courses
 * Uses weighted GPA calculation: sum(grade_points * credits) / sum(credits)
 */
export function calculateGPA(courses: Course[]): number {
  if (courses.length === 0) return 0;

  let totalPoints = 0;
  let totalCredits = 0;

  courses.forEach((course) => {
    const gradePoint = getGradePoint(course.grade);
    const credits = course.credits || 0;
    
    totalPoints += gradePoint * credits;
    totalCredits += credits;
  });

  if (totalCredits === 0) return 0;
  
  return totalPoints / totalCredits;
}

/**
 * Get grade point value from grade string
 * Supports both letter grades (A-F) and numeric grades (0-4.0)
 */
export function getGradePoint(grade: string): number {
  // If numeric grade (0-4.0)
  const numericGrade = parseFloat(grade);
  if (!isNaN(numericGrade) && numericGrade >= 0 && numericGrade <= 4.0) {
    return numericGrade;
  }

  // Find matching letter grade
  const gradePoint = GRADE_POINTS.find(
    (gp) => gp.grade.toUpperCase() === grade.toUpperCase()
  );

  return gradePoint?.points || 0;
}

/**
 * Calculate credits remaining to graduate
 */
export function getCreditsRemaining(
  totalRequired: number,
  completedCredits: number
): number {
  const remaining = totalRequired - completedCredits;
  return Math.max(0, remaining);
}

/**
 * Calculate completed credits from courses
 */
export function getCompletedCredits(courses: Course[]): number {
  return courses.reduce((total, course) => total + (course.credits || 0), 0);
}

/**
 * Calculate progress percentage
 */
export function getProgressPercentage(
  completedCredits: number,
  totalRequired: number
): number {
  if (totalRequired === 0) return 0;
  const percentage = (completedCredits / totalRequired) * 100;
  return Math.min(100, Math.max(0, percentage));
}

