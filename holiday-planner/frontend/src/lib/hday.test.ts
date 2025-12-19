import { describe, it, expect } from 'vitest'
import {
  getEventColor,
  getHalfDaySymbol,
  normalizeEventFlags,
  EVENT_COLORS,
  type EventFlag
} from './hday'

describe('getEventColor', () => {
  describe('default vacation/holiday colors', () => {
    it('returns HOLIDAY_FULL for no flags', () => {
      expect(getEventColor()).toBe(EVENT_COLORS.HOLIDAY_FULL)
    })

    it('returns HOLIDAY_FULL for empty array', () => {
      expect(getEventColor([])).toBe(EVENT_COLORS.HOLIDAY_FULL)
    })

    it('returns HOLIDAY_FULL for holiday flag without half-day', () => {
      expect(getEventColor(['holiday'])).toBe(EVENT_COLORS.HOLIDAY_FULL)
    })

    it('returns HOLIDAY_HALF for holiday with half_am', () => {
      expect(getEventColor(['holiday', 'half_am'])).toBe(EVENT_COLORS.HOLIDAY_HALF)
    })

    it('returns HOLIDAY_HALF for holiday with half_pm', () => {
      expect(getEventColor(['holiday', 'half_pm'])).toBe(EVENT_COLORS.HOLIDAY_HALF)
    })

    it('returns HOLIDAY_HALF for half_am without type flag', () => {
      expect(getEventColor(['half_am'])).toBe(EVENT_COLORS.HOLIDAY_HALF)
    })

    it('returns HOLIDAY_HALF for half_pm without type flag', () => {
      expect(getEventColor(['half_pm'])).toBe(EVENT_COLORS.HOLIDAY_HALF)
    })
  })

  describe('business event colors', () => {
    it('returns BUSINESS_FULL for business flag', () => {
      expect(getEventColor(['business'])).toBe(EVENT_COLORS.BUSINESS_FULL)
    })

    it('returns BUSINESS_HALF for business with half_am', () => {
      expect(getEventColor(['business', 'half_am'])).toBe(EVENT_COLORS.BUSINESS_HALF)
    })

    it('returns BUSINESS_HALF for business with half_pm', () => {
      expect(getEventColor(['business', 'half_pm'])).toBe(EVENT_COLORS.BUSINESS_HALF)
    })

    it('returns BUSINESS_HALF for business with both half_am and half_pm', () => {
      expect(getEventColor(['business', 'half_am', 'half_pm'])).toBe(EVENT_COLORS.BUSINESS_HALF)
    })
  })

  describe('course event colors', () => {
    it('returns COURSE_FULL for course flag', () => {
      expect(getEventColor(['course'])).toBe(EVENT_COLORS.COURSE_FULL)
    })

    it('returns COURSE_HALF for course with half_am', () => {
      expect(getEventColor(['course', 'half_am'])).toBe(EVENT_COLORS.COURSE_HALF)
    })

    it('returns COURSE_HALF for course with half_pm', () => {
      expect(getEventColor(['course', 'half_pm'])).toBe(EVENT_COLORS.COURSE_HALF)
    })
  })

  describe('in-office event colors', () => {
    it('returns IN_OFFICE_FULL for in flag', () => {
      expect(getEventColor(['in'])).toBe(EVENT_COLORS.IN_OFFICE_FULL)
    })

    it('returns IN_OFFICE_HALF for in with half_am', () => {
      expect(getEventColor(['in', 'half_am'])).toBe(EVENT_COLORS.IN_OFFICE_HALF)
    })

    it('returns IN_OFFICE_HALF for in with half_pm', () => {
      expect(getEventColor(['in', 'half_pm'])).toBe(EVENT_COLORS.IN_OFFICE_HALF)
    })
  })

  describe('priority handling with multiple type flags', () => {
    it('prioritizes business over course', () => {
      expect(getEventColor(['business', 'course'])).toBe(EVENT_COLORS.BUSINESS_FULL)
    })

    it('prioritizes business over in', () => {
      expect(getEventColor(['business', 'in'])).toBe(EVENT_COLORS.BUSINESS_FULL)
    })

    it('prioritizes business over holiday', () => {
      expect(getEventColor(['business', 'holiday'])).toBe(EVENT_COLORS.BUSINESS_FULL)
    })

    it('prioritizes course over in', () => {
      expect(getEventColor(['course', 'in'])).toBe(EVENT_COLORS.COURSE_FULL)
    })

    it('prioritizes course over holiday', () => {
      expect(getEventColor(['course', 'holiday'])).toBe(EVENT_COLORS.COURSE_FULL)
    })

    it('prioritizes in over holiday', () => {
      expect(getEventColor(['in', 'holiday'])).toBe(EVENT_COLORS.IN_OFFICE_FULL)
    })

    it('maintains priority with half-day flags', () => {
      expect(getEventColor(['business', 'course', 'half_am'])).toBe(EVENT_COLORS.BUSINESS_HALF)
      expect(getEventColor(['course', 'in', 'half_pm'])).toBe(EVENT_COLORS.COURSE_HALF)
    })
  })

  describe('color accessibility', () => {
    it('returns darker yellow (#E6B800) for course, not bright yellow', () => {
      expect(getEventColor(['course'])).toBe('#E6B800')
      expect(getEventColor(['course'])).not.toBe('#FFFF00')
    })

    it('returns teal (#0099AA) for in-office, not cyan', () => {
      expect(getEventColor(['in'])).toBe('#0099AA')
      expect(getEventColor(['in'])).not.toBe('#00FFFF')
    })
  })
})

describe('getHalfDaySymbol', () => {
  it('returns empty string for undefined flags', () => {
    expect(getHalfDaySymbol()).toBe('')
  })

  it('returns empty string for empty array', () => {
    expect(getHalfDaySymbol([])).toBe('')
  })

  it('returns left half-circle (◐) for half_am flag', () => {
    expect(getHalfDaySymbol(['half_am'])).toBe('◐')
  })

  it('returns right half-circle (◑) for half_pm flag', () => {
    expect(getHalfDaySymbol(['half_pm'])).toBe('◑')
  })

  it('returns ◐ when half_am is combined with other flags', () => {
    expect(getHalfDaySymbol(['business', 'half_am'])).toBe('◐')
  })

  it('returns ◑ when half_pm is combined with other flags', () => {
    expect(getHalfDaySymbol(['course', 'half_pm'])).toBe('◑')
  })

  it('returns empty string for full day events', () => {
    expect(getHalfDaySymbol(['business'])).toBe('')
    expect(getHalfDaySymbol(['course'])).toBe('')
    expect(getHalfDaySymbol(['in'])).toBe('')
    expect(getHalfDaySymbol(['holiday'])).toBe('')
  })

  it('prioritizes half_am when both half_am and half_pm are present', () => {
    // Based on the implementation, includes checks happen in order
    expect(getHalfDaySymbol(['half_am', 'half_pm'])).toBe('◐')
  })

  it('uses Unicode symbols that are more intuitive than comma/apostrophe', () => {
    // Verify we're not using the old symbols
    expect(getHalfDaySymbol(['half_am'])).not.toBe(',')
    expect(getHalfDaySymbol(['half_pm'])).not.toBe("'")
    // Verify Unicode codepoints
    expect(getHalfDaySymbol(['half_am']).charCodeAt(0)).toBe(0x25D0) // ◐
    expect(getHalfDaySymbol(['half_pm']).charCodeAt(0)).toBe(0x25D1) // ◑
  })
})

describe('normalizeEventFlags', () => {
  it('adds holiday flag when no type flags present', () => {
    const result = normalizeEventFlags([])
    expect(result).toContain('holiday')
  })

  it('adds holiday flag to half-day flags', () => {
    const result = normalizeEventFlags(['half_am'])
    expect(result).toContain('holiday')
    expect(result).toContain('half_am')
  })

  it('does not add holiday when business flag present', () => {
    const result = normalizeEventFlags(['business'])
    expect(result).not.toContain('holiday')
    expect(result).toContain('business')
  })

  it('does not add holiday when course flag present', () => {
    const result = normalizeEventFlags(['course'])
    expect(result).not.toContain('holiday')
  })

  it('does not add holiday when in flag present', () => {
    const result = normalizeEventFlags(['in'])
    expect(result).not.toContain('holiday')
  })

  it('preserves existing flags when adding holiday', () => {
    const result = normalizeEventFlags(['half_am', 'half_pm'])
    expect(result).toEqual(['half_am', 'half_pm', 'holiday'])
  })

  it('preserves existing flags when not adding holiday', () => {
    const result = normalizeEventFlags(['business', 'half_am'])
    expect(result).toEqual(['business', 'half_am'])
  })
})

describe('EVENT_COLORS constants', () => {
  it('defines all required color constants', () => {
    expect(EVENT_COLORS.HOLIDAY_FULL).toBe('#FF0000')
    expect(EVENT_COLORS.HOLIDAY_HALF).toBe('#FF9999')
    expect(EVENT_COLORS.BUSINESS_FULL).toBe('#FFA500')
    expect(EVENT_COLORS.BUSINESS_HALF).toBe('#FFCC77')
    expect(EVENT_COLORS.COURSE_FULL).toBe('#E6B800')
    expect(EVENT_COLORS.COURSE_HALF).toBe('#F5D966')
    expect(EVENT_COLORS.IN_OFFICE_FULL).toBe('#0099AA')
    expect(EVENT_COLORS.IN_OFFICE_HALF).toBe('#4DB8C9')
  })

  it('has valid hex color format for all colors', () => {
    const hexPattern = /^#[0-9A-F]{6}$/i
    Object.values(EVENT_COLORS).forEach(color => {
      expect(color).toMatch(hexPattern)
    })
  })
})
