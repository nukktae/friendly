/**
 * Formatter utility functions
 * Functions for formatting various data types to display strings
 */

/**
 * Format seconds to MM:SS time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a Date object to a time string (e.g., "10:30 AM")
 */
export function formatDateToTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format summary text into paragraphs (split by double newlines)
 */
export function formatSummaryParagraphs(summary: string): string[] {
  if (!summary) return [];
  return summary
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

