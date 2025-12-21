import { describe, expect, it } from 'vitest';
import {
  EVENT_COLORS,
  getEventColor,
  getHalfDaySymbol,
  type HdayEvent,
  normalizeEventFlags,
  sortEvents,
} from '../../src/lib/hday';

describe('getEventColor', () => {
  describe('default vacation/holiday colors', () => {
    it('returns HOLIDAY_FULL for no flags', () => {
      expect(getEventColor()).toBe(EVENT_COLORS.HOLIDAY_FULL);
    });

    it('returns HOLIDAY_FULL for empty array', () => {
      expect(getEventColor([])).toBe(EVENT_COLORS.HOLIDAY_FULL);
    });

    it('returns HOLIDAY_FULL for holiday flag without half-day', () => {
      expect(getEventColor(['holiday'])).toBe(EVENT_COLORS.HOLIDAY_FULL);
    });

    it('returns HOLIDAY_HALF for holiday with half_am', () => {
      expect(getEventColor(['holiday', 'half_am'])).toBe(
        EVENT_COLORS.HOLIDAY_HALF,
      );
    });

    it('returns HOLIDAY_HALF for holiday with half_pm', () => {
      expect(getEventColor(['holiday', 'half_pm'])).toBe(
        EVENT_COLORS.HOLIDAY_HALF,
      );
    });

    it('returns HOLIDAY_HALF for half_am without type flag', () => {
      expect(getEventColor(['half_am'])).toBe(EVENT_COLORS.HOLIDAY_HALF);
    });

    it('returns HOLIDAY_HALF for half_pm without type flag', () => {
      expect(getEventColor(['half_pm'])).toBe(EVENT_COLORS.HOLIDAY_HALF);
    });
  });

  describe('business event colors', () => {
    it('returns BUSINESS_FULL for business flag', () => {
      expect(getEventColor(['business'])).toBe(EVENT_COLORS.BUSINESS_FULL);
    });

    it('returns BUSINESS_HALF for business with half_am', () => {
      expect(getEventColor(['business', 'half_am'])).toBe(
        EVENT_COLORS.BUSINESS_HALF,
      );
    });

    it('returns BUSINESS_HALF for business with half_pm', () => {
      expect(getEventColor(['business', 'half_pm'])).toBe(
        EVENT_COLORS.BUSINESS_HALF,
      );
    });

    it('returns BUSINESS_FULL for business with both half_am and half_pm (both halves = full day)', () => {
      expect(getEventColor(['business', 'half_am', 'half_pm'])).toBe(
        EVENT_COLORS.BUSINESS_FULL,
      );
    });
  });

  describe('course event colors', () => {
    it('returns COURSE_FULL for course flag', () => {
      expect(getEventColor(['course'])).toBe(EVENT_COLORS.COURSE_FULL);
    });

    it('returns COURSE_HALF for course with half_am', () => {
      expect(getEventColor(['course', 'half_am'])).toBe(
        EVENT_COLORS.COURSE_HALF,
      );
    });

    it('returns COURSE_HALF for course with half_pm', () => {
      expect(getEventColor(['course', 'half_pm'])).toBe(
        EVENT_COLORS.COURSE_HALF,
      );
    });
  });

  describe('in-office event colors', () => {
    it('returns IN_OFFICE_FULL for in flag', () => {
      expect(getEventColor(['in'])).toBe(EVENT_COLORS.IN_OFFICE_FULL);
    });

    it('returns IN_OFFICE_HALF for in with half_am', () => {
      expect(getEventColor(['in', 'half_am'])).toBe(
        EVENT_COLORS.IN_OFFICE_HALF,
      );
    });

    it('returns IN_OFFICE_HALF for in with half_pm', () => {
      expect(getEventColor(['in', 'half_pm'])).toBe(
        EVENT_COLORS.IN_OFFICE_HALF,
      );
    });
  });

  describe('priority handling with multiple type flags', () => {
    it('prioritizes business over course', () => {
      expect(getEventColor(['business', 'course'])).toBe(
        EVENT_COLORS.BUSINESS_FULL,
      );
    });

    it('prioritizes business over in', () => {
      expect(getEventColor(['business', 'in'])).toBe(
        EVENT_COLORS.BUSINESS_FULL,
      );
    });

    it('prioritizes business over holiday', () => {
      expect(getEventColor(['business', 'holiday'])).toBe(
        EVENT_COLORS.BUSINESS_FULL,
      );
    });

    it('prioritizes course over in', () => {
      expect(getEventColor(['course', 'in'])).toBe(EVENT_COLORS.COURSE_FULL);
    });

    it('prioritizes course over holiday', () => {
      expect(getEventColor(['course', 'holiday'])).toBe(
        EVENT_COLORS.COURSE_FULL,
      );
    });

    it('prioritizes in over holiday', () => {
      expect(getEventColor(['in', 'holiday'])).toBe(
        EVENT_COLORS.IN_OFFICE_FULL,
      );
    });

    it('maintains priority with half-day flags', () => {
      expect(getEventColor(['business', 'course', 'half_am'])).toBe(
        EVENT_COLORS.BUSINESS_HALF,
      );
      expect(getEventColor(['course', 'in', 'half_pm'])).toBe(
        EVENT_COLORS.COURSE_HALF,
      );
    });
  });

  describe('color accessibility', () => {
    it('returns dark yellow/gold (#D9AD00) for course, not bright yellow', () => {
      expect(getEventColor(['course'])).toBe('#D9AD00');
      expect(getEventColor(['course'])).not.toBe('#FFFF00');
    });

    it('returns teal (#008899) for in-office, not cyan', () => {
      expect(getEventColor(['in'])).toBe('#008899');
      expect(getEventColor(['in'])).not.toBe('#00FFFF');
    });
  });
});

describe('getHalfDaySymbol', () => {
  it('returns empty string for undefined flags', () => {
    expect(getHalfDaySymbol()).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(getHalfDaySymbol([])).toBe('');
  });

  it('returns left half-circle (◐) for half_am flag', () => {
    expect(getHalfDaySymbol(['half_am'])).toBe('◐');
  });

  it('returns right half-circle (◑) for half_pm flag', () => {
    expect(getHalfDaySymbol(['half_pm'])).toBe('◑');
  });

  it('returns ◐ when half_am is combined with other flags', () => {
    expect(getHalfDaySymbol(['business', 'half_am'])).toBe('◐');
  });

  it('returns ◑ when half_pm is combined with other flags', () => {
    expect(getHalfDaySymbol(['course', 'half_pm'])).toBe('◑');
  });

  it('returns empty string for full day events', () => {
    expect(getHalfDaySymbol(['business'])).toBe('');
    expect(getHalfDaySymbol(['course'])).toBe('');
    expect(getHalfDaySymbol(['in'])).toBe('');
    expect(getHalfDaySymbol(['holiday'])).toBe('');
  });

  it('returns empty string when both half_am and half_pm are present (full day)', () => {
    expect(getHalfDaySymbol(['half_am', 'half_pm'])).toBe('');
  });

  it('uses Unicode symbols that are more intuitive than comma/apostrophe', () => {
    // Verify we're not using the old symbols
    expect(getHalfDaySymbol(['half_am'])).not.toBe(',');
    expect(getHalfDaySymbol(['half_pm'])).not.toBe("'");
    // Verify Unicode codepoints
    expect(getHalfDaySymbol(['half_am']).charCodeAt(0)).toBe(0x25d0); // ◐
    expect(getHalfDaySymbol(['half_pm']).charCodeAt(0)).toBe(0x25d1); // ◑
  });
});

describe('normalizeEventFlags', () => {
  it('adds holiday flag when no type flags present', () => {
    const result = normalizeEventFlags([]);
    expect(result).toContain('holiday');
  });

  it('adds holiday flag to half-day flags', () => {
    const result = normalizeEventFlags(['half_am']);
    expect(result).toContain('holiday');
    expect(result).toContain('half_am');
  });

  it('does not add holiday when business flag present', () => {
    const result = normalizeEventFlags(['business']);
    expect(result).not.toContain('holiday');
    expect(result).toContain('business');
  });

  it('does not add holiday when course flag present', () => {
    const result = normalizeEventFlags(['course']);
    expect(result).not.toContain('holiday');
  });

  it('does not add holiday when in flag present', () => {
    const result = normalizeEventFlags(['in']);
    expect(result).not.toContain('holiday');
  });

  it('preserves existing flags when adding holiday', () => {
    const result = normalizeEventFlags(['half_am', 'half_pm']);
    expect(result).toEqual(['half_am', 'half_pm', 'holiday']);
  });

  it('preserves existing flags when not adding holiday', () => {
    const result = normalizeEventFlags(['business', 'half_am']);
    expect(result).toEqual(['business', 'half_am']);
  });
});

describe('EVENT_COLORS constants', () => {
  it('defines all required color constants (WCAG AA compliant palette)', () => {
    expect(EVENT_COLORS.HOLIDAY_FULL).toBe('#EC0000');
    expect(EVENT_COLORS.HOLIDAY_HALF).toBe('#FF8A8A');
    expect(EVENT_COLORS.BUSINESS_FULL).toBe('#FF9500');
    expect(EVENT_COLORS.BUSINESS_HALF).toBe('#FFC04D');
    expect(EVENT_COLORS.COURSE_FULL).toBe('#D9AD00');
    expect(EVENT_COLORS.COURSE_HALF).toBe('#F0D04D');
    expect(EVENT_COLORS.IN_OFFICE_FULL).toBe('#008899');
    expect(EVENT_COLORS.IN_OFFICE_HALF).toBe('#00B8CC');
  });

  it('has valid hex color format for all colors', () => {
    const hexPattern = /^#[0-9A-F]{6}$/i;
    Object.values(EVENT_COLORS).forEach((color) => {
      expect(color).toMatch(hexPattern);
    });
  });
});

describe('sortEvents', () => {
  it('sorts range events by start date (oldest first)', () => {
    const events: HdayEvent[] = [
      {
        type: 'range',
        start: '2025/03/15',
        end: '2025/03/20',
        flags: ['holiday'],
        title: 'March vacation',
      },
      {
        type: 'range',
        start: '2025/01/10',
        end: '2025/01/15',
        flags: ['holiday'],
        title: 'January vacation',
      },
      {
        type: 'range',
        start: '2025/02/20',
        end: '2025/02/25',
        flags: ['holiday'],
        title: 'February vacation',
      },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].start).toBe('2025/01/10');
    expect(sorted[1].start).toBe('2025/02/20');
    expect(sorted[2].start).toBe('2025/03/15');
  });

  it('places range events before weekly events', () => {
    const events: HdayEvent[] = [
      { type: 'weekly', weekday: 1, flags: ['in'], title: 'Monday in office' },
      {
        type: 'range',
        start: '2025/12/25',
        end: '2025/12/25',
        flags: ['holiday'],
        title: 'Christmas',
      },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].type).toBe('range');
    expect(sorted[1].type).toBe('weekly');
  });

  it('sorts weekly events by weekday (Sunday=0 to Saturday=6)', () => {
    const events: HdayEvent[] = [
      { type: 'weekly', weekday: 5, flags: ['in'], title: 'Friday' },
      { type: 'weekly', weekday: 1, flags: ['in'], title: 'Monday' },
      { type: 'weekly', weekday: 3, flags: ['in'], title: 'Wednesday' },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].weekday).toBe(1);
    expect(sorted[1].weekday).toBe(3);
    expect(sorted[2].weekday).toBe(5);
  });

  it('places weekly events before unknown events', () => {
    const events: HdayEvent[] = [
      { type: 'unknown', raw: 'invalid line', flags: ['holiday'] },
      { type: 'weekly', weekday: 1, flags: ['in'], title: 'Monday' },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].type).toBe('weekly');
    expect(sorted[1].type).toBe('unknown');
  });

  it('places range events before unknown events', () => {
    const events: HdayEvent[] = [
      { type: 'unknown', raw: 'invalid line', flags: ['holiday'] },
      {
        type: 'range',
        start: '2025/12/25',
        end: '2025/12/25',
        flags: ['holiday'],
        title: 'Christmas',
      },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].type).toBe('range');
    expect(sorted[1].type).toBe('unknown');
  });

  it('sorts mixed event types correctly', () => {
    const events: HdayEvent[] = [
      { type: 'unknown', raw: 'line1', flags: ['holiday'] },
      { type: 'weekly', weekday: 2, flags: ['in'], title: 'Tuesday' },
      {
        type: 'range',
        start: '2025/06/01',
        end: '2025/06/05',
        flags: ['holiday'],
        title: 'June',
      },
      {
        type: 'range',
        start: '2025/01/01',
        end: '2025/01/01',
        flags: ['holiday'],
        title: 'New Year',
      },
      { type: 'weekly', weekday: 1, flags: ['in'], title: 'Monday' },
      { type: 'unknown', raw: 'line2', flags: ['holiday'] },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].type).toBe('range');
    expect(sorted[0].start).toBe('2025/01/01');
    expect(sorted[1].type).toBe('range');
    expect(sorted[1].start).toBe('2025/06/01');
    expect(sorted[2].type).toBe('weekly');
    expect(sorted[2].weekday).toBe(1);
    expect(sorted[3].type).toBe('weekly');
    expect(sorted[3].weekday).toBe(2);
    expect(sorted[4].type).toBe('unknown');
    expect(sorted[5].type).toBe('unknown');
  });

  it('does not mutate the original array', () => {
    const events: HdayEvent[] = [
      {
        type: 'range',
        start: '2025/03/15',
        end: '2025/03/20',
        flags: ['holiday'],
        title: 'March',
      },
      {
        type: 'range',
        start: '2025/01/10',
        end: '2025/01/15',
        flags: ['holiday'],
        title: 'January',
      },
    ];

    const original = [...events];
    const sorted = sortEvents(events);

    // Original array should be unchanged
    expect(events).toEqual(original);
    expect(events[0].start).toBe('2025/03/15');

    // Sorted array should be different
    expect(sorted[0].start).toBe('2025/01/10');
  });

  it('handles empty array', () => {
    const sorted = sortEvents([]);
    expect(sorted).toEqual([]);
  });

  it('handles single event', () => {
    const events: HdayEvent[] = [
      {
        type: 'range',
        start: '2025/12/25',
        end: '2025/12/25',
        flags: ['holiday'],
        title: 'Christmas',
      },
    ];

    const sorted = sortEvents(events);

    expect(sorted).toEqual(events);
  });

  it('sorts events with missing start dates to the end of range events', () => {
    const events: HdayEvent[] = [
      {
        type: 'range',
        start: undefined,
        end: '2025/12/25',
        flags: ['holiday'],
        title: 'No start',
      } as HdayEvent,
      {
        type: 'range',
        start: '2025/01/10',
        end: '2025/01/15',
        flags: ['holiday'],
        title: 'January',
      },
      {
        type: 'range',
        start: '2025/03/15',
        end: '2025/03/20',
        flags: ['holiday'],
        title: 'March',
      },
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].title).toBe('January');
    expect(sorted[1].title).toBe('March');
    expect(sorted[2].title).toBe('No start');
  });

  it('handles multiple events with missing start dates', () => {
    const events: HdayEvent[] = [
      {
        type: 'range',
        start: undefined,
        end: '2025/12/25',
        flags: ['holiday'],
        title: 'No start A',
      } as HdayEvent,
      {
        type: 'range',
        start: '2025/01/10',
        end: '2025/01/15',
        flags: ['holiday'],
        title: 'January',
      },
      {
        type: 'range',
        start: undefined,
        end: '2025/12/30',
        flags: ['holiday'],
        title: 'No start B',
      } as HdayEvent,
    ];

    const sorted = sortEvents(events);

    expect(sorted[0].title).toBe('January');
    // Events without start dates maintain their relative order (stable sort)
    expect(sorted[1].title).toBe('No start A');
    expect(sorted[2].title).toBe('No start B');
  });
});
