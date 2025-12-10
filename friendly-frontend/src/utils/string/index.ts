/**
 * String utility functions
 * Functions for sanitizing, cleaning, and manipulating strings
 */

/**
 * Sanitize text by removing React/HTML-like elements and cleaning up formatting
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Remove any React/HTML-like elements that might have been accidentally included
  return text
    .replace(/<View[^>]*>.*?<\/View>/gis, '')
    .replace(/<View[^>]*\/>/gis, '')
    .replace(/<div[^>]*>.*?<\/div>/gis, '')
    .replace(/<div[^>]*\/>/gis, '')
    .replace(/\[Object\]/g, '')
    .replace(/\[Array\]/g, '')
    .replace(/ref=\{null\}/g, '')
    .replace(/style="[^"]*"/g, '')
    .replace(/style=\{[^}]*\}/g, '')
    .replace(/children="[^"]*"/g, '')
    .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert string to title case
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

