import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatDate } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to DD/MM/YYYY format for display
 * @param dateString Date string in any format
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDateString(dateString: string | Date): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatDate(date, 'dd/MM/yyyy');
}

/**
 * Format a date to the standard system format: DD/MM/YYYY
 * @param date Date object or ISO string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatStandardDate(date: Date | string | null | undefined): string {
  if (!date) {
    return formatDate(new Date(), 'dd/MM/yyyy'); // Use current date as fallback
  }
  
  try {
    // If date is a string, convert to Date object safely
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date encountered:', date);
      return formatDate(new Date(), 'dd/MM/yyyy'); // Use current date as fallback
    }
    
    // Format as DD/MM/YYYY
    return formatDate(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return formatDate(new Date(), 'dd/MM/yyyy'); // Use current date as fallback
  }
}

/**
 * Format a date for database storage in ISO format
 * @param date Date object or DD/MM/YYYY string
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForStorage(date: Date | string): string {
  if (typeof date === 'string' && date.includes('/')) {
    // Convert from DD/MM/YYYY to ISO
    const [day, month, year] = date.split('/').map(Number)
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }
  
  // If already a Date object or ISO string, ensure it's in YYYY-MM-DD format
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDate(dateObj, 'yyyy-MM-dd')
}

/**
 * Parse a date string in DD/MM/YYYY format to a Date object
 * @param dateString Date in DD/MM/YYYY format
 * @returns Date object
 */
export function parseStandardDate(dateString: string | null | undefined): Date {
  if (!dateString) {
    return new Date(); // Return current date if no date provided
  }
  
  try {
    if (!dateString.includes('/')) {
      // Already in another format
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    const [day, month, year] = dateString.split('/').map(Number);
    
    // Validate the date components
    if (isNaN(day) || isNaN(month) || isNaN(year) || 
        day < 1 || day > 31 || month < 1 || month > 12) {
      console.warn('Invalid date components:', { day, month, year });
      return new Date();
    }
    
    // month is 0-indexed in JS Date
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error('Error parsing date:', error, dateString);
    return new Date();
  }
}
