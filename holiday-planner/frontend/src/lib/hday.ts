// Type definitions for .hday format
export type HdayEvent = {
  type: 'range' | 'weekly' | 'unknown'
  start?: string
  end?: string
  weekday?: number
  flags?: string[]
  title?: string
  raw?: string
}

// Helper to serialize event back to .hday line format
export function toLine(ev: HdayEvent): string {
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
  }
  return ev.raw || ''
}

/**
 * Returns the hex background color for an event based on its flags.
 *
 * Color mapping:
 *
 * - Default vacation/holiday (no `business`, `course` or `in` flag):
 *   - Full day (no `half_am` / `half_pm`): `'#FF0000'` (red)
 *   - Half day (with `half_am` or `half_pm`): `'#FF9999'` (pink)
 *
 * - Business (`'business'` flag present):
 *   - Full day: `'#FFA500'` (orange)
 *   - Half day (with `half_am` or `half_pm`): `'#FFCC77'` (light orange)
 *
 * - Course (`'course'` flag present):
 *   - Full day: `'#E6B800'` (darker yellow for accessibility)
 *   - Half day (with `half_am` or `half_pm`): `'#F5D966'` (light yellow)
 *
 * - In-office (`'in'` flag present):
 *   - Full day: `'#0099AA'` (teal for accessibility)
 *   - Half day (with `half_am` or `half_pm`): `'#4DB8C9'` (light teal)
 *
 * If `flags` is omitted or an empty array, the function uses the default
 * vacation/holiday color for a full day: `'#FF0000'`.
 *
 * Note: When multiple type flags are present (e.g., both 'business' and 'course'),
 * the function prioritizes in this order: business > course > in > holiday.
 *
 * @example
 * ```ts
 * getEventColor(); // '#FF0000' (default full-day vacation)
 * getEventColor([]); // '#FF0000'
 * getEventColor(['half_am']); // '#FF9999' (half-day vacation)
 * getEventColor(['business']); // '#FFA500'
 * getEventColor(['business', 'half_am']); // '#FFCC77'
 * getEventColor(['course']); // '#E6B800'
 * getEventColor(['course', 'half_pm']); // '#F5D966'
 * getEventColor(['in']); // '#0099AA'
 * getEventColor(['in', 'half_am']); // '#4DB8C9'
 * ```
 *
 * @param flags Optional list of flags describing the event type and half-day status.
 * @returns A CSS hex color string representing the event background color.
 */
export function getEventColor(flags?: string[]): string {
  if (!flags || flags.length === 0) return '#FF0000' // Red - default vacation
  
  const hasHalfDay = flags.includes('half_am') || flags.includes('half_pm')
  
  // Determine base color based on type flags (priority: business > course > in > holiday)
  if (flags.includes('business')) {
    return hasHalfDay ? '#FFCC77' : '#FFA500' // Orange (light for half day)
  } else if (flags.includes('course')) {
    return hasHalfDay ? '#F5D966' : '#E6B800' // Darker yellow for better contrast
  } else if (flags.includes('in')) {
    return hasHalfDay ? '#4DB8C9' : '#0099AA' // Teal for better contrast
  } else {
    // Holiday/vacation (default)
    return hasHalfDay ? '#FF9999' : '#FF0000' // Red (pink for half day)
  }
}

// Get symbol to display for half-day events
export function getHalfDaySymbol(flags?: string[]): string {
  if (!flags) return ''
  if (flags.includes('half_am')) return ','
  if (flags.includes('half_pm')) return "'"
  return ''
}
