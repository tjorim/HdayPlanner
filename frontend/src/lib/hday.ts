// Type definitions for event flags
export type HalfDayFlag = 'half_am' | 'half_pm'
export type TypeFlag = 'business' | 'course' | 'in' | 'holiday'
export type EventFlag = HalfDayFlag | TypeFlag

// Type definitions for .hday format
export type HdayEvent = {
  type: 'range' | 'weekly' | 'unknown'
  start?: string
  end?: string
  weekday?: number
  flags?: EventFlag[]
  title?: string
  raw?: string
}

// Type flags that override the default 'holiday' flag
const TYPE_FLAGS = ['business', 'course', 'in'] as const
const TYPE_FLAGS_SET = new Set<string>(TYPE_FLAGS)

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
  HOLIDAY_FULL: '#EC0000',    // Red - full day vacation/holiday
  HOLIDAY_HALF: '#FF8A8A',    // Pink - half day vacation/holiday
  BUSINESS_FULL: '#FF9500',   // Orange - full day business trip
  BUSINESS_HALF: '#FFC04D',   // Light orange - half day business
  COURSE_FULL: '#D9AD00',     // Dark yellow/gold - full day course
  COURSE_HALF: '#F0D04D',     // Light yellow - half day course
  IN_OFFICE_FULL: '#008899',  // Teal - full day in-office
  IN_OFFICE_HALF: '#00B8CC',  // Light teal - half day in-office
} as const

/**
 * Parse prefix flags from .hday format into normalized flag names.
 * Adds 'holiday' as default if no type flags (business/course/in) are present.
 *
 * @param prefix String of single-character flags (e.g., 'ap' for half_am + half_pm)
 * @returns Array of normalized flag names
 */
function parsePrefixFlags(prefix: string): EventFlag[] {
  const flagMap: Record<string, EventFlag> = {
    a: 'half_am',
    p: 'half_pm',
    b: 'business',
    s: 'course',
    i: 'in'
  }

  const flags: EventFlag[] = []
  for (const ch of prefix) {
    if (flagMap[ch]) {
      flags.push(flagMap[ch])
    } else {
      console.warn(`Unknown flag character '${ch}' ignored. Known flags: a, p, b, s, i`)
    }
  }

  return normalizeEventFlags(flags)
}

/**
 * Normalize event flags by adding 'holiday' as default if no type flags are present.
 *
 * Type flags that override the default 'holiday' are:
 * - 'business' - Business trip or work-related event
 * - 'course' - Training or educational course
 * - 'in' - In-office day
 *
 * @param flags Array of flag names
 * @returns Array with 'holiday' added if no type flags present
 */
export function normalizeEventFlags(flags: EventFlag[]): EventFlag[] {
  // Default to 'holiday' if no type flags
  if (!flags.some(f => TYPE_FLAGS_SET.has(f))) {
    return [...flags, 'holiday']
  }
  return [...flags]
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
  const reRange = /^(?<prefix>[a-z]*)?(?<start>\d{4}\/\d{2}\/\d{2})(?:-(?<end>\d{4}\/\d{2}\/\d{2}))?(?:\s*#\s*(?<title>.*))?$/i
  const reWeekly = /^(?<prefix>[a-z]*?)d(?<weekday>[0-6])(?:\s*#\s*(?<title>.*))?$/i

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const events: HdayEvent[] = []

  for (const line of lines) {
    // Try parsing as range event
    const rangeMatch = line.match(reRange)
    if (rangeMatch?.groups) {
      const { prefix = '', start, end, title = '' } = rangeMatch.groups
      const flags = parsePrefixFlags(prefix)

      events.push({
        type: 'range',
        start,
        end: end || start,
        flags,
        title: title.trim(),
        raw: line
      })
      continue
    }

    // Try parsing as weekly event
    const weeklyMatch = line.match(reWeekly)
    if (weeklyMatch?.groups) {
      const { prefix = '', weekday, title = '' } = weeklyMatch.groups
      const flags = parsePrefixFlags(prefix)

      events.push({
        type: 'weekly',
        weekday: parseInt(weekday, 10),
        flags,
        title: title.trim(),
        raw: line
      })
      continue
    }

    // Unknown format - keep as-is
    events.push({
      type: 'unknown',
      raw: line,
      flags: ['holiday']
    })
  }

  return events
}

// Helper to serialize event back to .hday line format
export function toLine(ev: Omit<HdayEvent, 'raw'> | HdayEvent): string {
  const flagMap: Record<string, string> = {
    half_am: 'a',
    half_pm: 'p',
    business: 'b',
    course: 's',
    in: 'i'
  }
  
  const prefix = (ev.flags || [])
    .filter(f => f !== 'holiday')
    .map(f => flagMap[f] || '')
    .join('')
  
  const title = ev.title ? ` # ${ev.title}` : ''
  
  if (ev.type === 'range') {
    if (ev.start === ev.end) {
      return `${prefix}${ev.start}${title}`
    }
    return `${prefix}${ev.start}-${ev.end}${title}`
  } else if (ev.type === 'weekly') {
    return `${prefix}d${ev.weekday}${title}`
  } else if (ev.type === 'unknown') {
    // Unknown event types must have the raw field for serialization
    if ('raw' in ev && ev.raw) {
      return ev.raw
    }
    throw new Error(
      `Cannot serialize unknown event type: missing 'raw' field. ` +
      `Event: type=${ev.type}, title="${ev.title || '(none)'}", flags=${JSON.stringify(ev.flags || [])}`
    )
  }
  
  // Fallback for completely unsupported types
  throw new Error(`Unsupported event type for serialization: ${ev.type}`)
}

/**
 * Returns the hex background color for an event based on its flags.
 *
 * Color mapping (using EVENT_COLORS constants):
 *
 * - Default vacation/holiday (no `business`, `course` or `in` flag):
 *   - Full day (no half flag OR both `half_am` and `half_pm`): HOLIDAY_FULL (red)
 *   - Half day (exactly one of `half_am` or `half_pm`): HOLIDAY_HALF (pink)
 *
 * - Business (`'business'` flag present):
 *   - Full day: BUSINESS_FULL (orange)
 *   - Half day: BUSINESS_HALF (light orange)
 *
 * - Course (`'course'` flag present):
 *   - Full day: COURSE_FULL (dark yellow/gold)
 *   - Half day: COURSE_HALF (light yellow)
 *
 * - In-office (`'in'` flag present):
 *   - Full day: IN_OFFICE_FULL (teal)
 *   - Half day: IN_OFFICE_HALF (light teal)
 *
 * If `flags` is omitted or an empty array, returns HOLIDAY_FULL.
 *
 * Note: When multiple type flags are present (e.g., both 'business' and 'course'),
 * the function prioritizes in this order: business > course > in > holiday.
 *
 * Note: When both `half_am` and `half_pm` are present, the event is treated as a
 * full day since it spans both halves.
 *
 * @example
 * ```ts
 * getEventColor(); // EVENT_COLORS.HOLIDAY_FULL
 * getEventColor([]); // EVENT_COLORS.HOLIDAY_FULL
 * getEventColor(['half_am']); // EVENT_COLORS.HOLIDAY_HALF
 * getEventColor(['half_am', 'half_pm']); // EVENT_COLORS.HOLIDAY_FULL (both halves = full day)
 * getEventColor(['business']); // EVENT_COLORS.BUSINESS_FULL
 * getEventColor(['business', 'half_am']); // EVENT_COLORS.BUSINESS_HALF
 * getEventColor(['course']); // EVENT_COLORS.COURSE_FULL
 * getEventColor(['course', 'half_pm']); // EVENT_COLORS.COURSE_HALF
 * getEventColor(['in']); // EVENT_COLORS.IN_OFFICE_FULL
 * getEventColor(['in', 'half_am']); // EVENT_COLORS.IN_OFFICE_HALF
 * ```
 *
 * @param flags Optional list of flags describing the event type and half-day status.
 * @returns A CSS hex color string representing the event background color.
 */
export function getEventColor(flags?: EventFlag[]): string {
  if (!flags || flags.length === 0) return EVENT_COLORS.HOLIDAY_FULL

  // Only treat as half-day if exactly one half flag is present (XOR logic)
  // Both half_am and half_pm together means a full day
  const hasHalfDay = flags.includes('half_am') !== flags.includes('half_pm')

  // Determine base color based on type flags (priority: business > course > in > holiday)
  if (flags.includes('business')) {
    return hasHalfDay ? EVENT_COLORS.BUSINESS_HALF : EVENT_COLORS.BUSINESS_FULL
  } else if (flags.includes('course')) {
    return hasHalfDay ? EVENT_COLORS.COURSE_HALF : EVENT_COLORS.COURSE_FULL
  } else if (flags.includes('in')) {
    return hasHalfDay ? EVENT_COLORS.IN_OFFICE_HALF : EVENT_COLORS.IN_OFFICE_FULL
  } else {
    // Holiday/vacation (default)
    return hasHalfDay ? EVENT_COLORS.HOLIDAY_HALF : EVENT_COLORS.HOLIDAY_FULL
  }
}

/**
 * Get symbol to display for half-day events.
 *
 * Uses Unicode half-circle symbols for visual clarity:
 * - ◐ (U+25D0) for AM - left half filled represents morning
 * - ◑ (U+25D1) for PM - right half filled represents afternoon
 *
 * These symbols are combined with aria-labels for accessibility.
 *
 * @param flags Optional list of flags
 * @returns Half-day symbol: `◐` for AM, `◑` for PM, or empty string
 */
export function getHalfDaySymbol(flags?: EventFlag[]): string {
  if (!flags) return ''
  
  const hasAm = flags.includes('half_am')
  const hasPm = flags.includes('half_pm')
  
  // Both flags = full day, no symbol
  if (hasAm && hasPm) return ''
  
  // Only one flag = half day, show symbol
  if (hasAm) return '◐'
  if (hasPm) return '◑'
  
  return ''
}

// Helper to get an event CSS class based on flags
export function getEventClass(flags?: EventFlag[]): string {
  if (!flags || flags.length === 0) return 'event--holiday-full'

  const hasAm = flags.includes('half_am')
  const hasPm = flags.includes('half_pm')
  const half = hasAm !== hasPm ? 'half' : 'full'

  if (flags.includes('business')) return `event--business-${half}`
  if (flags.includes('course')) return `event--course-${half}`
  if (flags.includes('in')) return `event--in-office-${half}`
  return `event--holiday-${half}`
}
