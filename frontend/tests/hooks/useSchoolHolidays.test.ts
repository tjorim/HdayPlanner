import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSchoolHolidayName,
  type SchoolHoliday,
  useSchoolHolidays,
} from '../../src/hooks/useSchoolHolidays';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSchoolHolidays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch school holidays successfully', async () => {
    const mockHolidays: SchoolHoliday[] = [
      {
        id: 'holiday-1',
        startDate: '2025-04-18',
        endDate: '2025-05-05',
        type: 'School',
        name: [{ language: 'EN', text: 'Spring Break' }],
        regionalScope: 'Regional',
        temporalScope: 'FullDay',
        nationwide: false,
        subdivisions: [{ code: 'NL-NH', shortName: 'NH' }],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHolidays,
    });

    const { result } = renderHook(() => useSchoolHolidays('NL', 2025, 'NL-NH', 'EN', true));

    expect(result.current.loading).toBe(true);
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual(mockHolidays);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openholidaysapi.org/SchoolHolidays?countryIsoCode=NL&validFrom=2025-01-01&validTo=2025-12-31&languageIsoCode=EN&subdivisionCode=NL-NH',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() => useSchoolHolidays('NL', 2025, 'NL-NH', 'EN', false));

    expect(result.current.loading).toBe(false);
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle non-OK responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => {
        throw new Error('Should not reach here');
      },
    });

    const { result } = renderHook(() => useSchoolHolidays('NL', 2025, 'NL-NH'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch school holidays: 500 Server Error');
  });

  it('should handle timeout errors', async () => {
    const timeoutError = new Error('Timeout');
    timeoutError.name = 'TimeoutError';
    mockFetch.mockRejectedValueOnce(timeoutError);

    const { result } = renderHook(() => useSchoolHolidays('NL', 2025, 'NL-NH'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Request timeout: Unable to reach school holiday API');
  });
});

describe('getSchoolHolidayName', () => {
  it('returns matching language name when available', () => {
    const holiday: SchoolHoliday = {
      id: 'holiday-1',
      startDate: '2025-04-18',
      endDate: '2025-05-05',
      type: 'School',
      name: [
        { language: 'EN', text: 'Spring Break' },
        { language: 'NL', text: 'Meivakantie' },
      ],
      regionalScope: 'Regional',
      temporalScope: 'FullDay',
      nationwide: false,
      subdivisions: [{ code: 'NL-NH', shortName: 'NH' }],
    };

    expect(getSchoolHolidayName(holiday, 'NL')).toBe('Meivakantie');
  });

  it('falls back to the first name when language is missing', () => {
    const holiday: SchoolHoliday = {
      id: 'holiday-1',
      startDate: '2025-04-18',
      endDate: '2025-05-05',
      type: 'School',
      name: [{ language: 'EN', text: 'Spring Break' }],
      regionalScope: 'Regional',
      temporalScope: 'FullDay',
      nationwide: false,
      subdivisions: [{ code: 'NL-NH', shortName: 'NH' }],
    };

    expect(getSchoolHolidayName(holiday, 'DE')).toBe('Spring Break');
  });
});
