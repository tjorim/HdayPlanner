import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HdayEvent } from '../lib/hday';
import { MonthGrid } from './MonthGrid';

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

describe('MonthGrid - National Holidays', () => {
  it('displays holiday indicator when holiday is provided', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-01';

    // Create a mock holiday map
    const holidays = new Map([
      ['2025/01/01', { name: "New Year's Day", localName: 'Nieuwjaarsdag' }],
    ]);

    render(<MonthGrid events={events} ym={ym} nationalHolidays={holidays} />);

    // Check that the cell has holiday class
    const holidayCell = screen.getByLabelText("2025/01/01 - New Year's Day");
    expect(holidayCell.className).toContain('day--holiday');

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
    const holidays = new Map([
      ['2025/01/01', { name: "New Year's Day", localName: 'Nieuwjaarsdag' }],
      [
        '2025/01/20',
        { name: 'MLK Day', localName: 'Martin Luther King Jr. Day' },
      ],
    ]);

    render(<MonthGrid events={events} ym={ym} nationalHolidays={holidays} />);

    // Check first holiday
    const newYearCell = screen.getByLabelText("2025/01/01 - New Year's Day");
    expect(newYearCell.className).toContain('day--holiday');

    // Check second holiday
    const mlkCell = screen.getByLabelText('2025/01/20 - MLK Day');
    expect(mlkCell.className).toContain('day--holiday');

    // Check that there are exactly 2 holiday indicators
    const indicators = screen.getAllByText('🎉');
    expect(indicators.length).toBe(2);
  });

  it('applies both weekend and holiday classes when holiday falls on weekend', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-01';

    // January 4, 2025 is a Saturday
    const holidays = new Map([
      ['2025/01/04', { name: 'Test Holiday', localName: 'Test Holiday Local' }],
    ]);

    render(<MonthGrid events={events} ym={ym} nationalHolidays={holidays} />);

    const cell = screen.getByLabelText('2025/01/04 - Test Holiday');
    expect(cell.className).toContain('day--weekend');
    expect(cell.className).toContain('day--holiday');
  });

  it('includes holiday name in aria-label for accessibility', () => {
    const events: HdayEvent[] = [];
    const ym = '2025-12';

    const holidays = new Map([
      ['2025/12/25', { name: 'Christmas Day', localName: 'Kerstmis' }],
    ]);

    render(<MonthGrid events={events} ym={ym} nationalHolidays={holidays} />);

    const cell = screen.getByLabelText('2025/12/25 - Christmas Day');
    expect(cell.getAttribute('aria-label')).toBe('2025/12/25 - Christmas Day');
  });
});
