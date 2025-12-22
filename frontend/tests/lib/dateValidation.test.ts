import { describe, expect, it } from 'vitest';
import { isValidDate, parseHdayDate } from '../../src/lib/dateValidation';

describe('isValidDate', () => {
  describe('valid dates', () => {
    it('accepts valid date in correct format', () => {
      expect(isValidDate('2025/12/18')).toBe(true);
    });

    it('accepts valid date with leading zeros', () => {
      expect(isValidDate('2025/01/05')).toBe(true);
    });

    it('accepts leap year date', () => {
      expect(isValidDate('2024/02/29')).toBe(true);
    });

    it('accepts end of month dates', () => {
      expect(isValidDate('2025/01/31')).toBe(true);
      expect(isValidDate('2025/04/30')).toBe(true);
    });
  });

  describe('invalid format', () => {
    it('rejects date with wrong separator', () => {
      expect(isValidDate('2025-12-18')).toBe(false);
      expect(isValidDate('2025.12.18')).toBe(false);
    });

    it('rejects date without separators', () => {
      expect(isValidDate('20251218')).toBe(false);
    });

    it('rejects date with missing parts', () => {
      expect(isValidDate('2025/12')).toBe(false);
      expect(isValidDate('2025')).toBe(false);
    });

    it('rejects date with extra parts', () => {
      expect(isValidDate('2025/12/18/00')).toBe(false);
    });

    it('rejects date with wrong number of digits', () => {
      expect(isValidDate('25/12/18')).toBe(false);
      expect(isValidDate('2025/1/5')).toBe(false);
      expect(isValidDate('2025/012/018')).toBe(false);
    });

    it('rejects non-numeric values', () => {
      expect(isValidDate('YYYY/MM/DD')).toBe(false);
      expect(isValidDate('2025/Dec/18')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('invalid dates (correct format but impossible dates)', () => {
    it('rejects invalid month', () => {
      expect(isValidDate('2025/13/01')).toBe(false);
      expect(isValidDate('2025/00/01')).toBe(false);
    });

    it('rejects invalid day', () => {
      expect(isValidDate('2025/01/32')).toBe(false);
      expect(isValidDate('2025/01/00')).toBe(false);
    });

    it('rejects February 30th', () => {
      expect(isValidDate('2025/02/30')).toBe(false);
    });

    it('rejects February 29th in non-leap year', () => {
      expect(isValidDate('2025/02/29')).toBe(false);
      expect(isValidDate('2023/02/29')).toBe(false);
    });

    it('rejects 31st in months with 30 days', () => {
      expect(isValidDate('2025/04/31')).toBe(false); // April
      expect(isValidDate('2025/06/31')).toBe(false); // June
      expect(isValidDate('2025/09/31')).toBe(false); // September
      expect(isValidDate('2025/11/31')).toBe(false); // November
    });

    it('rejects impossible dates that JavaScript would roll over', () => {
      // JavaScript Date would roll 2025/12/32 to 2026/01/01
      // Our validation should reject it
      expect(isValidDate('2025/12/32')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles year 2000 (leap year)', () => {
      expect(isValidDate('2000/02/29')).toBe(true);
    });

    it('handles year 1900 (not a leap year)', () => {
      expect(isValidDate('1900/02/29')).toBe(false);
    });

    it('handles future dates', () => {
      expect(isValidDate('2099/12/31')).toBe(true);
    });

    it('handles past dates', () => {
      expect(isValidDate('1970/01/01')).toBe(true);
    });
  });
});

describe('date range comparison', () => {
  it('correctly identifies when end date is before start date', () => {
    const start = '2025/12/20';
    const end = '2025/12/18';

    const startDate = parseHdayDate(start);
    const endDate = parseHdayDate(end);

    expect(endDate < startDate).toBe(true);
  });

  it('correctly identifies when end date is same as start date', () => {
    const start = '2025/12/20';
    const end = '2025/12/20';

    const startDate = parseHdayDate(start);
    const endDate = parseHdayDate(end);

    expect(endDate >= startDate).toBe(true);
  });

  it('correctly identifies when end date is after start date', () => {
    const start = '2025/12/20';
    const end = '2025/12/25';

    const startDate = parseHdayDate(start);
    const endDate = parseHdayDate(end);

    expect(endDate >= startDate).toBe(true);
  });
});

describe('parseHdayDate', () => {
  it('parses valid date string to Date object', () => {
    const dateString = '2025/12/25';
    const date = parseHdayDate(dateString);

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December is month 11 (0-indexed)
    expect(date.getDate()).toBe(25);
  });

  it('handles leap year date correctly', () => {
    const dateString = '2024/02/29';
    const date = parseHdayDate(dateString);

    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(1); // February is month 1
    expect(date.getDate()).toBe(29);
  });
});
