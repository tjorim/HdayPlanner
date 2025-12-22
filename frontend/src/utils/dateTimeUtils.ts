import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/en-gb';

// Configure dayjs with plugins and locale
// isoWeek plugin: Provides Monday-first week calculations
// en-gb locale: Sets British English locale (Monday as week start)
dayjs.extend(isoWeek);
dayjs.locale('en-gb');

// Export the configured dayjs instance
export { dayjs };

/**
 * Format a date in HdayPlanner's YYYY/MM/DD format
 * @param date - Date to format
 * @returns Formatted date string (e.g., "2025/12/22")
 */
export const formatHdayDate = (date: Date | dayjs.Dayjs): string => {
  return dayjs(date).format('YYYY/MM/DD');
};

/**
 * Get ISO weekday (1-7) where Monday=1, Sunday=7
 * This replaces JavaScript's getDay() which uses Sunday=0
 * @param date - Date to get weekday from
 * @returns ISO weekday number (1-7)
 */
export const getISOWeekday = (date: Date | dayjs.Dayjs): number => {
  return dayjs(date).isoWeekday();
};

/**
 * Get the Monday of the week containing the given date
 * @param date - Any date in the target week
 * @returns Date object for Monday of that week
 */
export const getMonday = (date: Date | dayjs.Dayjs): Date => {
  return dayjs(date).startOf('isoWeek').toDate();
};

/**
 * Pad a number to 2 digits with leading zero
 * @param n - Number to pad
 * @returns Padded string (e.g., "05" for 5)
 */
export const pad2 = (n: number): string => {
  return String(n).padStart(2, '0');
};

/**
 * Map of ISO weekday numbers to abbreviated day names.
 * ISO weekday: 1=Monday, 2=Tuesday, ..., 7=Sunday
 */
const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

/**
 * Convert ISO weekday number (1-7) to abbreviated day name.
 * @param isoWeekday ISO weekday: 1=Mon, 2=Tue, ..., 7=Sun
 * @returns Abbreviated day name (e.g., "Mon", "Tue", etc.)
 */
export const getWeekdayName = (isoWeekday: number): string => {
  return WEEKDAY_NAMES[isoWeekday] || '';
};
