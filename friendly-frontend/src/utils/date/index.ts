/**
 * Date utility functions
 * Functions for formatting, parsing, and manipulating dates
 */

/**
 * Format a date from various formats (string, Firestore timestamp, Date) to a readable date string
 */
export function formatDate(
  date: string | { _seconds: number; _nanoseconds: number } | Date | undefined
): string {
  if (!date) return 'Unknown';
  
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString();
  }
  
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  
  // Firestore timestamp format
  const seconds = (date as any)._seconds || (date as any).seconds || 0;
  return new Date(seconds * 1000).toLocaleDateString();
}

/**
 * Format a date to a readable string with weekday, month, and day
 */
export function formatDateToString(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a timestamp to a relative time string (e.g., "2h ago", "3d ago")
 */
export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return 'Just now';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return 'Just now';
  }
}

/**
 * Get date for a specific day of the week in the current week
 */
export function getDateForDay(day: string): Date {
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };
  
  const targetDay = dayMap[day] ?? 1; // Default to Monday
  const today = new Date();
  const currentDay = today.getDay();
  const diff = targetDay - currentDay;
  
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return date;
}

