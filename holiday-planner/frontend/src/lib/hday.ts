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

// Get the background color for an event based on its flags
export function getEventColor(flags?: string[]): string {
  if (!flags || flags.length === 0) return '#FF0000' // Red - default vacation
  
  const hasHalfDay = flags.includes('half_am') || flags.includes('half_pm')
  
  // Determine base color based on type flags
  if (flags.includes('business')) {
    return hasHalfDay ? '#FFCC77' : '#FFA500' // Orange (light for half day)
  } else if (flags.includes('course')) {
    return hasHalfDay ? '#FFFF99' : '#FFFF00' // Yellow (light for half day)
  } else if (flags.includes('in')) {
    return hasHalfDay ? '#99FFFF' : '#00FFFF' // Cyan (light for half day)
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
