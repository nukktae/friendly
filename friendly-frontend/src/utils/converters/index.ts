/**
 * Converter utility functions
 * Functions for converting between different data formats
 */

import { getDateForDay } from '../date';

/**
 * Parse time string (e.g., "10:30 AM") to a Date object
 * Pins the date to a specific day of the week
 */
export function parseTimeToDate(
  timeStr: string, 
  day: string, 
  isStart: boolean = true
): Date {
  const date = getDateForDay(day);
  
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    date.setHours(hours, minutes, 0, 0);
  }
  return date;
}

/**
 * Get image URL, handling both absolute and relative paths
 */
export function getImageUrl(
  imageUrl: string | null | undefined, 
  baseUrl?: string
): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // If it's a relative path, construct full URL
  const base = baseUrl || 'http://localhost:4000';
  return `${base}${imageUrl}`;
}

