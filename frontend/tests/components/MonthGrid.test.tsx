import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthGrid } from '../../src/components/MonthGrid';
import type { HdayEvent } from '../../src/lib/hday';

describe('MonthGrid - Today Highlighting', () => {
  // Helper to get today's date in YYYY-MM format for the component prop
  const getTodayYM = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Helper to get today's date in YYYY/MM/DD format
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  it("applies day--today CSS class to today's date", () => {
    const events: HdayEvent[] = [];
    const todayYM = getTodayYM();

    render(<MonthGrid events={events} ym={todayYM} />);

    const todayStr = getTodayStr();
    const todayCell = screen.getByLabelText(`${todayStr} (Today)`);

    expect(todayCell).toBeDefined();
    expect(todayCell.className).toContain('day--today');
  });

  it('applies aria-current="date" only to today\'s date', () => {
    const events: HdayEvent[] = [];
    const todayYM = getTodayYM();

    render(<MonthGrid events={events} ym={todayYM} />);

    const todayStr = getTodayStr();
    const todayCell = screen.getByLabelText(`${todayStr} (Today)`);

    expect(todayCell.getAttribute('aria-current')).toBe('date');
  });

  it('includes "(Today)" in aria-label for today\'s date', () => {
    const events: HdayEvent[] = [];
    const todayYM = getTodayYM();

    render(<MonthGrid events={events} ym={todayYM} />);

    const todayStr = getTodayStr();
    const todayCell = screen.queryByLabelText(`${todayStr} (Today)`);

    expect(todayCell).toBeDefined();
    expect(todayCell?.getAttribute('aria-label')).toBe(`${todayStr} (Today)`);
  });

  it('does not apply day--today class to non-today dates', () => {
    const events: HdayEvent[] = [];
    const todayYM = getTodayYM();

    render(<MonthGrid events={events} ym={todayYM} />);

    // Get all day cells
    const allCells = screen
      .getAllByRole('generic')
      .filter(
        (el) =>
          el.className.includes('day') && !el.className.includes('calendar'),
      );

    // Count cells with day--today class (should be exactly 1)
    const todayCells = allCells.filter((el) =>
      el.className.includes('day--today'),
    );

    expect(todayCells.length).toBe(1);
  });

  it('does not apply aria-current="date" to non-today dates', () => {
    const events: HdayEvent[] = [];
    const todayYM = getTodayYM();

    render(<MonthGrid events={events} ym={todayYM} />);

    // Get all day cells with aria-current="date"
    const cellsWithAriaCurrent = screen
      .queryAllByRole('generic')
      .filter((el) => el.getAttribute('aria-current') === 'date');

    // Should only be 1 cell with aria-current="date"
    expect(cellsWithAriaCurrent.length).toBe(1);
  });

  it('does not highlight today when viewing a different month', () => {
    const events: HdayEvent[] = [];
    // Use a month that's definitely not current (January 2020)
    const differentMonth = '2020-01';

    render(<MonthGrid events={events} ym={differentMonth} />);

    // Try to find any cell with "(Today)" in the label
    const todayCell = screen.queryByLabelText(/\(Today\)/);

    // Should not find today's date in January 2020
    expect(todayCell).toBeNull();
  });

  it('does not apply day--today class when viewing a different month', () => {
    const events: HdayEvent[] = [];
    // Use a month that's definitely not current (January 2020)
    const differentMonth = '2020-01';

    render(<MonthGrid events={events} ym={differentMonth} />);

    // Get all day cells
    const allCells = screen
      .getAllByRole('generic')
      .filter(
        (el) =>
          el.className.includes('day') && !el.className.includes('calendar'),
      );

    // No cells should have day--today class
    const todayCells = allCells.filter((el) =>
      el.className.includes('day--today'),
    );

    expect(todayCells.length).toBe(0);
  });
});

describe('MonthGrid - Weekly Recurring Events', () => {
  it('displays weekly recurring event on correct weekday', () => {
    // Create a weekly event for Monday (weekday 1)
    const events: HdayEvent[] = [
      {
        type: 'weekly',
        weekday: 1, // Monday
        flags: ['holiday'],
        title: 'Weekly Monday Off',
        raw: 'd1 # Weekly Monday Off',
      },
    ];

    // Use January 2025: January 6, 13, 20, 27 are Mondays
    const ym = '2025-01';
    render(<MonthGrid events={events} ym={ym} />);

    // Check that the event appears on at least one Monday
    const eventItems = screen.getAllByText('Weekly Monday Off');

    // Should appear multiple times (once for each Monday in the month)
    expect(eventItems.length).toBeGreaterThan(0);
  });

  it('displays weekly recurring event on all matching weekdays in month', () => {
    // Create a weekly event for Friday (weekday 5)
    const events: HdayEvent[] = [
      {
        type: 'weekly',
        weekday: 5, // Friday
        flags: ['holiday'],
        title: 'Weekly Friday',
        raw: 'd5 # Weekly Friday',
      },
    ];

    // Use January 2025: has 5 Fridays (3, 10, 17, 24, 31)
    const ym = '2025-01';
    render(<MonthGrid events={events} ym={ym} />);

    const eventItems = screen.getAllByText('Weekly Friday');

    // January 2025 has exactly 5 Fridays
    expect(eventItems.length).toBe(5);
  });

  it('displays multiple weekly recurring events on same day', () => {
    // Create two weekly events for Wednesday (weekday 3)
    const events: HdayEvent[] = [
      {
        type: 'weekly',
        weekday: 3, // Wednesday
        flags: ['holiday'],
        title: 'Weekly Event 1',
        raw: 'd3 # Weekly Event 1',
      },
      {
        type: 'weekly',
        weekday: 3, // Wednesday
        flags: ['course'],
        title: 'Weekly Event 2',
        raw: 'sd3 # Weekly Event 2',
      },
    ];

    // Use January 2025: has 5 Wednesdays (1, 8, 15, 22, 29)
    const ym = '2025-01';
    render(<MonthGrid events={events} ym={ym} />);

    const event1Items = screen.getAllByText('Weekly Event 1');
    const event2Items = screen.getAllByText('Weekly Event 2');

    // Both events should appear 5 times (once per Wednesday)
    expect(event1Items.length).toBe(5);
    expect(event2Items.length).toBe(5);
  });

  it('displays both range events and weekly recurring events together', () => {
    // Create both a range event and a weekly event
    const events: HdayEvent[] = [
      {
        type: 'range',
        start: '2025/01/06',
        end: '2025/01/10',
        flags: ['holiday'],
        title: 'Vacation Week',
        raw: '2025/01/06-2025/01/10 # Vacation Week',
      },
      {
        type: 'weekly',
        weekday: 1, // Monday
        flags: ['holiday'],
        title: 'Weekly Monday',
        raw: 'd1 # Weekly Monday',
      },
    ];

    // Use January 2025
    const ym = '2025-01';
    render(<MonthGrid events={events} ym={ym} />);

    // Range event should appear on days in its range
    const vacationItems = screen.getAllByText('Vacation Week');
    expect(vacationItems.length).toBe(5); // 5 days: Jan 6-10

    // Weekly event should appear on all Mondays (Jan 6, 13, 20, 27)
    const mondayItems = screen.getAllByText('Weekly Monday');
    expect(mondayItems.length).toBe(4); // 4 Mondays in January 2025
  });

  it('displays weekly recurring event with half-day flags correctly', () => {
    // Create a weekly event for Tuesday with half-day AM flag
    const events: HdayEvent[] = [
      {
        type: 'weekly',
        weekday: 2, // Tuesday
        flags: ['half_am', 'holiday'],
        title: 'Tuesday AM Off',
        raw: 'ad2 # Tuesday AM Off',
      },
    ];

    // Use January 2025, which has 4 Tuesdays (7, 14, 21, 28)
    const ym = '2025-01';
    render(<MonthGrid events={events} ym={ym} />);

    const eventItems = screen.getAllByText('Tuesday AM Off');

    // January 2025 has 4 Tuesdays (7, 14, 21, 28)
    expect(eventItems.length).toBe(4);

    // Check that the half-day symbol is present
    const halfDaySymbols = screen.getAllByLabelText('Morning half-day event');
    expect(halfDaySymbols.length).toBe(4);
  });

  it('displays weekly recurring event only on matching weekdays', () => {
    // Create a weekly event for Sunday (weekday 0)
    const events: HdayEvent[] = [
      {
        type: 'weekly',
        weekday: 0, // Sunday
        flags: ['holiday'],
        title: 'Sunday Event',
        raw: 'd0 # Sunday Event',
      },
    ];

    // Use January 2025
    const ym = '2025-01';
    render(<MonthGrid events={events} ym={ym} />);

    const eventItems = screen.getAllByText('Sunday Event');

    // January 2025 has 4 Sundays (5, 12, 19, 26)
    expect(eventItems.length).toBe(4);
  });
});
