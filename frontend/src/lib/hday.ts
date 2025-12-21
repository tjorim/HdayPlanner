// Type definitions for event flags
export type HalfDayFlag = 'half_am' | 'half_pm';
export type TypeFlag = 'business' | 'course' | 'in' | 'holiday';
export type EventFlag = HalfDayFlag | TypeFlag;

// Type definitions for .hday format
export type HdayEvent = {
  type: 'range' | 'weekly' | 'unknown';
  start?: string;
  end?: string;
  weekday?: number;
  flags?: EventFlag[];
  title?: string;
  raw?: string;
};

// Type flags that override the default 'holiday' flag
const TYPE_FLAGS = ['business', 'course', 'in'] as const;
const TYPE_FLAGS_SET = new Set<string>(TYPE_FLAGS);

/**
 * Color constants for event backgrounds.
 * All colors meet WCAG AA accessibility standards (4.5:1 contrast minimum) with black text (#000).
 * Verified contrast ratios:
 * - HOLIDAY_FULL: 4.57:1   - HOLIDAY_HALF: 9.25:1
 * - BUSINESS_FULL: 9.55:1  - BUSINESS_HALF: 12.90:1
 * - COURSE_FULL: 9.93:1    - COURSE_HALF: 13.83:1
 * - IN_OFFICE_FULL: 4.98:1 - IN_OFFICE_HALF: 8.73:1
 */
export const EVENT_COLORS = {
  HOLIDAY_FULL: '#EC0000', // Red - full day vacation/holiday
  HOLIDAY_HALF: '#FF8A8A', // Pink - half day vacation/holiday
  BUSINESS_FULL: '#FF9500', // Orange - full day business trip
  BUSINESS_HALF: '#FFC04D', // Light orange - half day business
  COURSE_FULL: '#D9AD00', // Dark yellow/gold - full day course
  COURSE_HALF: '#F0D04D', // Light yellow - half day course
  IN_OFFICE_FULL: '#008899', // Teal - full day in-office
  IN_OFFICE_HALF: '#00B8CC', // Light teal - half day in-office
} as const;

/**
 * Parse a prefix string of single-character flags into normalized event flags.
 *
 * Unknown characters in the prefix are ignored (a console warning is emitted).
 *
 * @param prefix - A string of single-character flags (e.g., "ap" for `half_am` + `half_pm`)
 * @returns The list of normalized `EventFlag` values; if no type flag (`business`, `course`, `in`) is present, the result will include `holiday`.
 */
function parsePrefixFlags(prefix: string): EventFlag[] {
  const flagMap: Record<string, EventFlag> = {
    a: 'half_am',
    p: 'half_pm',
    b: 'business',
    s: 'course',
    i: 'in',
  };

  const flags: EventFlag[] = [];
  for (const ch of prefix) {
    if (flagMap[ch]) {
      flags.push(flagMap[ch]);
    } else {
      console.warn(
        `Unknown flag character '${ch}' ignored. Known flags: a, p, b, s, i`,
      );
    }
  }

  return normalizeEventFlags(flags);
}

/**
 * Ensure an array of event flags includes a type flag by appending `'holiday'` when none of `'business'`, `'course'`, or `'in'` is present.
 *
 * @param flags - The event flags to normalize
 * @returns A new array with `'holiday'` appended if no type flag is present; the input array is never modified.
 */
export function normalizeEventFlags(flags: EventFlag[]): EventFlag[] {
  // Default to 'holiday' if no type flags
  if (!flags.some((f) => TYPE_FLAGS_SET.has(f))) {
    return [...flags, 'holiday'];
  }
  return [...flags];
}

/**
 * Parse .hday text format into an array of HdayEvent objects.
 *
 * Format:
 * - Range events: `[prefix]YYYY/MM/DD-YYYY/MM/DD # title`
 * - Weekly events: `[prefix]dN # title` where N is 0-6 (Sun-Sat)
 * - Prefix flags: a=half_am, p=half_pm, b=business, s=course, i=in
 * - Events without type flags (b/s/i) default to 'holiday'
 *
 * @param text Raw .hday file content
 * @returns Array of parsed events
 */
export function parseHday(text: string): HdayEvent[] {
  const reRange =
    /^(?<prefix>[a-z]*)?(?<start>\d{4}\/\d{2}\/\d{2})(?:-(?<end>\d{4}\/\d{2}\/\d{2}))?(?:\s*#\s*(?<title>.*))?$/i;
  const reWeekly =
    /^(?<prefix>[a-z]*?)d(?<weekday>[0-6])(?:\s*#\s*(?<title>.*))?$/i;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const events: HdayEvent[] = [];

  for (const line of lines) {
    // Try parsing as range event
    const rangeMatch = line.match(reRange);
    if (rangeMatch?.groups) {
      const { prefix = '', start, end, title = '' } = rangeMatch.groups;
      const flags = parsePrefixFlags(prefix);

      events.push({
        type: 'range',
        start,
        end: end || start,
        flags,
        title: title.trim(),
        raw: line,
      });
      continue;
    }

    // Try parsing as weekly event
    const weeklyMatch = line.match(reWeekly);
    if (weeklyMatch?.groups) {
      const { prefix = '', weekday, title = '' } = weeklyMatch.groups;
      const flags = parsePrefixFlags(prefix);

      events.push({
        type: 'weekly',
        weekday: parseInt(weekday, 10),
        flags,
        title: title.trim(),
        raw: line,
      });
      continue;
    }

    // Unknown format - keep as-is
    events.push({
      type: 'unknown',
      raw: line,
      flags: ['holiday'],
    });
  }

  return events;
}

/**
 * Serialize an HdayEvent into a single .hday-format text line.
 *
 * @param ev - The event to serialize; for `unknown` events the `raw` field must be present.
 * @returns The corresponding single-line representation suitable for a .hday file.
 * @throws Error if an `unknown` event is missing its `raw` field or if the event `type` is unsupported.
 */
export function toLine(ev: Omit<HdayEvent, 'raw'> | HdayEvent): string {
  const flagMap: Record<string, string> = {
    half_am: 'a',
    half_pm: 'p',
    business: 'b',
    course: 's',
    in: 'i',
  };

  const prefix = (ev.flags || [])
    .filter((f) => f !== 'holiday')
    .map((f) => flagMap[f] || '')
    .join('');

  const title = ev.title ? ` # ${ev.title}` : '';

  if (ev.type === 'range') {
    if (ev.start === ev.end) {
      return `${prefix}${ev.start}${title}`;
    }
    return `${prefix}${ev.start}-${ev.end}${title}`;
  } else if (ev.type === 'weekly') {
    return `${prefix}d${ev.weekday}${title}`;
  } else if (ev.type === 'unknown') {
    // Unknown event types must have the raw field for serialization
    if ('raw' in ev && ev.raw) {
      return ev.raw;
    }
    throw new Error(
      `Cannot serialize unknown event type: missing 'raw' field. ` +
        `Event: type=${ev.type}, title="${ev.title || '(none)'}", flags=${JSON.stringify(ev.flags || [])}`,
    );
  }

  // Fallback for completely unsupported types
  throw new Error(`Unsupported event type for serialization: ${ev.type}`);
}

/**
 * Get the hex background color for an event based on its flags.
 *
 * Determines the color from EVENT_COLORS based on the event type flag
 * (`business`, `course`, `in`, or `holiday`). When multiple type flags are
 * present (edge case), the priority is: business > course > in > holiday.
 * Half-day status is derived from the half-day flags: exactly one of
 * `half_am` or `half_pm` means a half-day; both or neither means a full day.
 *
 * @param flags - Optional list of event flags (type and/or half-day indicators).
 * @returns The hex color string to use as the event background.
 */
export function getEventColor(flags?: EventFlag[]): string {
  if (!flags || flags.length === 0) return EVENT_COLORS.HOLIDAY_FULL;

  // Only treat as half-day if exactly one half flag is present (XOR logic)
  // Both half_am and half_pm together means a full day
  const hasHalfDay = flags.includes('half_am') !== flags.includes('half_pm');

  // Determine base color based on type flags (priority: business > course > in > holiday)
  if (flags.includes('business')) {
    return hasHalfDay ? EVENT_COLORS.BUSINESS_HALF : EVENT_COLORS.BUSINESS_FULL;
  } else if (flags.includes('course')) {
    return hasHalfDay ? EVENT_COLORS.COURSE_HALF : EVENT_COLORS.COURSE_FULL;
  } else if (flags.includes('in')) {
    return hasHalfDay
      ? EVENT_COLORS.IN_OFFICE_HALF
      : EVENT_COLORS.IN_OFFICE_FULL;
  } else {
    // Holiday/vacation (default)
    return hasHalfDay ? EVENT_COLORS.HOLIDAY_HALF : EVENT_COLORS.HOLIDAY_FULL;
  }
}

/**
 * Return a Unicode symbol representing a half-day based on event flags.
 *
 * @param flags - Optional list of event flags; presence of `half_am` or `half_pm` determines the symbol
 * @returns `◐` if only `half_am` is present, `◑` if only `half_pm` is present, or an empty string otherwise
 */
export function getHalfDaySymbol(flags?: EventFlag[]): string {
  if (!flags) return '';

  const hasAm = flags.includes('half_am');
  const hasPm = flags.includes('half_pm');

  // Both flags = full day, no symbol
  if (hasAm && hasPm) return '';

  // Only one flag = half day, show symbol
  if (hasAm) return '◐';
  if (hasPm) return '◑';

  return '';
}

/**
 * Compute the CSS class name for an event from its flags.
 *
 * @param flags - Array of event flags; type flags are 'business', 'course', 'in', and half-day flags are 'half_am' and 'half_pm'.
 * @returns A class of the form `event--{business|course|in-office|holiday}-{full|half}` where the type is chosen by priority (business > course > in) and the suffix is `half` when exactly one of `half_am` or `half_pm` is present (otherwise `full` for both or neither).
 */
export function getEventClass(flags?: EventFlag[]): string {
  if (!flags || flags.length === 0) return 'event--holiday-full';

  const hasAm = flags.includes('half_am');
  const hasPm = flags.includes('half_pm');
  const half = hasAm !== hasPm ? 'half' : 'full';

  if (flags.includes('business')) return `event--business-${half}`;
  if (flags.includes('course')) return `event--course-${half}`;
  if (flags.includes('in')) return `event--in-office-${half}`;
  return `event--holiday-${half}`;
}

/**
 * Sort events by date and type.
 *
 * Sorting order:
 * 1. Range events sorted by start date (oldest first)
 * 2. Weekly events sorted by weekday (Sunday=0 to Saturday=6)
 * 3. Unknown events at the end (maintain original order)
 *
 * @param events Array of HdayEvent objects to sort
 * @returns A new sorted array (does not mutate the original)
 */
export function sortEvents(events: HdayEvent[]): HdayEvent[] {
  return [...events].sort((a, b) => {
    // Range events come first, sorted by start date
    if (a.type === 'range' && b.type === 'range') {
      const aStart = a.start;
      const bStart = b.start;

      // If both are missing a start date, keep relative order (stable sort)
      if (!aStart && !bStart) return 0;
      // Events missing a start date are sorted after those with a valid start
      if (!aStart) return 1;
      if (!bStart) return -1;

      return aStart.localeCompare(bStart);
    }

    // Range before weekly
    if (a.type === 'range' && b.type === 'weekly') return -1;
    if (a.type === 'weekly' && b.type === 'range') return 1;

    // Weekly events sorted by weekday
    if (a.type === 'weekly' && b.type === 'weekly') {
      const aDay = a.weekday ?? 0;
      const bDay = b.weekday ?? 0;
      return aDay - bDay;
    }

    // Weekly before unknown
    if (a.type === 'weekly' && b.type === 'unknown') return -1;
    if (a.type === 'unknown' && b.type === 'weekly') return 1;

    // Range before unknown
    if (a.type === 'range' && b.type === 'unknown') return -1;
    if (a.type === 'unknown' && b.type === 'range') return 1;

    // For unknown vs unknown, we rely on Array.sort being stable (ES2019+) to preserve original order
    return 0;
  });
}