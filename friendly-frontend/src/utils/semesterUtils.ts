/**
 * Semester utility functions for managing academic semesters
 */

export type SemesterType = 'Fall' | 'Spring';

/**
 * Format semester as "2025 Fall" or "2025 Spring"
 */
export function formatSemester(year: number, semester: number): string {
  const semesterName = semester === 1 ? 'Fall' : 'Spring';
  return `${year} ${semesterName}`;
}

/**
 * Parse semester string "2025 Fall" to year and semester number
 */
export function parseSemester(semesterString: string): { year: number; semester: number } | null {
  const match = semesterString.match(/(\d{4})\s+(Fall|Spring)/i);
  if (!match) return null;
  
  const year = parseInt(match[1], 10);
  const semester = match[2].toLowerCase() === 'fall' ? 1 : 2;
  
  return { year, semester };
}

/**
 * Get current semester based on current date
 * Aug-Dec = Fall (semester 1), Jan-Jul = Spring (semester 2)
 */
export function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // Aug-Dec (8-12) = Fall, Jan-Jul (1-7) = Spring
  const semester = month >= 8 ? 1 : 2;
  
  // If it's Jan-Jul, we're in Spring of current year
  // If it's Aug-Dec, we're in Fall of current year
  return formatSemester(year, semester);
}

/**
 * Generate list of semesters from start year/semester to current
 */
export function generateSemesterList(startYear: number, startSemester: number): string[] {
  const semesters: string[] = [];
  const current = getCurrentSemester();
  const currentParsed = parseSemester(current);
  
  if (!currentParsed) return semesters;
  
  let year = startYear;
  let semester = startSemester;
  
  while (year < currentParsed.year || (year === currentParsed.year && semester <= currentParsed.semester)) {
    semesters.push(formatSemester(year, semester));
    
    // Move to next semester
    if (semester === 1) {
      semester = 2; // Fall -> Spring
    } else {
      semester = 1; // Spring -> Fall
      year++; // Move to next year
    }
  }
  
  return semesters;
}

/**
 * Get display name for semester (same as formatSemester for now)
 */
export function getSemesterDisplayName(semester: string): string {
  return semester;
}

/**
 * Compare two semesters (for sorting)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareSemesters(a: string, b: string): number {
  const aParsed = parseSemester(a);
  const bParsed = parseSemester(b);
  
  if (!aParsed || !bParsed) return 0;
  
  if (aParsed.year !== bParsed.year) {
    return bParsed.year - aParsed.year; // Descending (newest first)
  }
  
  return bParsed.semester - aParsed.semester; // Descending (Fall before Spring)
}

/**
 * Get next semester after given semester
 */
export function getNextSemester(semester: string): string | null {
  const parsed = parseSemester(semester);
  if (!parsed) return null;
  
  if (parsed.semester === 1) {
    // Fall -> Spring (same year)
    return formatSemester(parsed.year, 2);
  } else {
    // Spring -> Fall (next year)
    return formatSemester(parsed.year + 1, 1);
  }
}

