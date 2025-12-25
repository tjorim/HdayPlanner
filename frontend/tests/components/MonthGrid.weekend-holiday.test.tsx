import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthGrid } from '../../src/components/MonthGrid';
import type { HdayEvent } from '../../src/lib/hday';

describe('MonthGrid - Weekend Highlighting', () => {
  it('applies weekend CSS class to Saturday and Sunday', () => {
    const events: HdayEvent[] = [];
    // January 2025: 1st is Wednesday, 4th is Saturday, 5th is Sunday
    const ym = '2025-01';

    render(<MonthGrid events={events} ym={ym} />);

    // Check Saturday (Jan 4, 2025)
    const saturdayCell = screen.getByLabelText('2025/01/04');
    expect(saturdayCell.className).toContain('day--weekend');

    // Check Sunday (Jan 5, 2025)
    const sundayCell = screen.getByLabelText('2025/01/05');
    expect(sundayCell.className).toContain('day--weekend');
  });

  it('does not apply weekend class to weekdays', () => {
    const events: HdayEvent[] = [];
    // January 2025: 1st is Wednesday
    const ym = '2025-01';

    render(<MonthGrid events={events} ym={ym} />);

    // Check Wednesday (Jan 1, 2025)
    const wednesdayCell = screen.getByLabelText('2025/01/01');
    expect(wednesdayCell.className).not.toContain('day--weekend');

    // Check Monday (Jan 6, 2025)
    const mondayCell = screen.getByLabelText('2025/01/06');
    expect(mondayCell.className).not.toContain('day--weekend');
  });
});

describe('MonthGrid - Public Holidays', () => {
  it('displays holiday indicator when holiday is provided', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-01';

    // Create a mock holiday map
    const publicHolidays = new Map([
      ['2025/01/01', { name: "New Year's Day", localName: 'Nieuwjaarsdag' }],
    ]);

    render(<MonthGrid events={events} ym={ym} publicHolidays={publicHolidays} />);

    // Check that the cell has holiday class
    const holidayCell = screen.getByLabelText("2025/01/01 - New Year's Day");
    expect(holidayCell.className).toContain('day--public-holiday');

    // Check that the holiday indicator emoji is present
    const indicator = screen.getByTitle('Nieuwjaarsdag');
    expect(indicator.textContent).toBe('🎉');
  });

  it('does not display holiday indicator when no holidays are provided', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-01';

    render(<MonthGrid events={events} ym={ym} />);

    // Check that no holiday indicators are present
    const indicators = screen.queryAllByText('🎉');
    expect(indicators.length).toBe(0);
  });

  it('displays multiple holidays in the same month', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-01';

    // Create a mock holiday map with multiple holidays
    const publicHolidays = new Map([
      ['2025/01/01', { name: "New Year's Day", localName: 'Nieuwjaarsdag' }],
      ['2025/01/20', { name: 'MLK Day', localName: 'Martin Luther King Jr. Day' }],
    ]);

    render(<MonthGrid events={events} ym={ym} publicHolidays={publicHolidays} />);

    // Check first holiday
    const newYearCell = screen.getByLabelText("2025/01/01 - New Year's Day");
    expect(newYearCell.className).toContain('day--public-holiday');

    // Check second holiday
    const mlkCell = screen.getByLabelText('2025/01/20 - MLK Day');
    expect(mlkCell.className).toContain('day--public-holiday');

    // Check that there are exactly 2 holiday indicators
    const indicators = screen.getAllByText('🎉');
    expect(indicators.length).toBe(2);
  });

  it('applies both weekend and holiday classes when holiday falls on weekend', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-01';

    // January 4, 2025 is a Saturday
    const publicHolidays = new Map([
      ['2025/01/04', { name: 'Test Holiday', localName: 'Test Holiday Local' }],
    ]);

    render(<MonthGrid events={events} ym={ym} publicHolidays={publicHolidays} />);

    const cell = screen.getByLabelText('2025/01/04 - Test Holiday');
    expect(cell.className).toContain('day--weekend');
    expect(cell.className).toContain('day--public-holiday');
  });

  it('includes holiday name in aria-label for accessibility', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-12';

    const publicHolidays = new Map([
      ['2025/12/25', { name: 'Christmas Day', localName: 'Kerstmis' }],
    ]);

    render(<MonthGrid events={events} ym={ym} publicHolidays={publicHolidays} />);

    // getByLabelText will throw if element with this aria-label doesn't exist
    screen.getByLabelText(/2025\/12\/25(?: \(Today\))? - Christmas Day/);
  });
});

describe('MonthGrid - School Holidays', () => {
  it('displays school holiday indicator and aria-label', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-04';

    const schoolHolidays = new Map([['2025/04/18', { name: 'Spring Break' }]]);

    render(<MonthGrid events={events} ym={ym} schoolHolidays={schoolHolidays} />);

    const holidayCell = screen.getByLabelText('2025/04/18 - School Holiday: Spring Break');
    expect(holidayCell.className).toContain('day--school-holiday');

    const indicator = screen.getByTitle('Spring Break');
    expect(indicator.textContent).toBe('🏫');
  });

  it('includes both public and school holiday labels when overlapping', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-04';

    const publicHolidays = new Map([
      ['2025/04/18', { name: 'Good Friday', localName: 'Goede Vrijdag' }],
    ]);
    const schoolHolidays = new Map([['2025/04/18', { name: 'Spring Break' }]]);

    render(
      <MonthGrid
        events={events}
        ym={ym}
        publicHolidays={publicHolidays}
        schoolHolidays={schoolHolidays}
      />,
    );

    const holidayCell = screen.getByLabelText(
      '2025/04/18 - Good Friday - School Holiday: Spring Break',
    );
    expect(holidayCell.className).toContain('day--public-holiday');
    expect(holidayCell.className).toContain('day--school-holiday');
  });
});
