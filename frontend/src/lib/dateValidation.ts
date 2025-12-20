/**
 * Date validation utilities for the .hday format (YYYY/MM/DD)
 */

const DATE_FORMAT_REGEX = /^\d{4}\/\d{2}\/\d{2}$/

/**
 * Validates a date string in YYYY/MM/DD format.
 * 
 * Checks both format (via regex) and whether the date is valid
 * (e.g., rejects Feb 30, April 31, invalid months like 13, etc.)
 * 
 * @param dateString Date in YYYY/MM/DD format
 * @returns true if the date is valid, false otherwise
 * 
 * @example
 * isValidDate('2025/12/25') // true
 * isValidDate('2025/02/30') // false (Feb doesn't have 30 days)
 * isValidDate('2025-12-25') // false (wrong separator)
 */
export function isValidDate(dateString: string): boolean {
  if (!DATE_FORMAT_REGEX.test(dateString)) {
    return false
  }
  const [year, month, day] = dateString.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day
}

/**
 * Parses a validated date string in YYYY/MM/DD format to a Date object.
 * 
 * Note: This assumes the date string has already been validated.
 * Use isValidDate() first to ensure the date is valid.
 * 
 * @param dateString Date in YYYY/MM/DD format
 * @returns Date object in local timezone
 * 
 * @example
 * parseHdayDate('2025/12/25') // Date object for Dec 25, 2025 in local time
 */
export function parseHdayDate(dateString: string): Date {
  const [year, month, day] = dateString.split('/').map(Number)
  return new Date(year, month - 1, day)
}
