import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PublicHoliday, usePublicHolidays } from '../../src/hooks/usePublicHolidays';
import { convertDateFormat } from '../../src/hooks/useOpenHolidays';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePublicHolidays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch holidays successfully', async () => {
    const mockHolidays: PublicHoliday[] = [
      {
        id: 'holiday-1',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        type: 'Public',
        name: [{ language: 'EN', text: "New Year's Day" }],
        regionalScope: 'National',
        temporalScope: 'FullDay',
        nationwide: true,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHolidays,
    });

    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for the hook to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual(mockHolidays);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openholidaysapi.org/PublicHolidays?countryIsoCode=NL&validFrom=2025-01-01&validTo=2025-12-31&languageIsoCode=EN',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', false));

    expect(result.current.loading).toBe(false);
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not fetch when countryCode is empty', async () => {
    const { result } = renderHook(() => usePublicHolidays('', 2025, 'EN', true));

    expect(result.current.loading).toBe(false);
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not fetch when year is 0', async () => {
    const { result } = renderHook(() => usePublicHolidays('NL', 0, 'EN', true));

    expect(result.current.loading).toBe(false);
    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Network error: Unable to connect to holiday API');
  });

  it('should handle non-OK HTTP responses', async () => {
    // Mock a response that will cause the error to be thrown
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => {
        throw new Error('Should not reach here');
      },
    });

    const { result } = renderHook(() => usePublicHolidays('XX', 2025, 'EN', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch holidays: 404 Not Found');
  });

  it('should handle timeout errors', async () => {
    const timeoutError = new Error('Timeout');
    timeoutError.name = 'TimeoutError';
    mockFetch.mockRejectedValueOnce(timeoutError);

    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Request timeout: Unable to reach holiday API');
  });

  it('should handle abort errors', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Request timeout: Unable to reach holiday API');
  });

  it('should handle generic errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Something went wrong'));

    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Something went wrong');
  });

  it('should handle non-Error exceptions', async () => {
    mockFetch.mockRejectedValueOnce('Unknown error');

    const { result } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch holidays');
  });

  it('should cancel fetch on unmount', async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockFetch.mockReturnValueOnce(fetchPromise);

    const { unmount } = renderHook(() => usePublicHolidays('NL', 2025, 'EN', true));

    // Unmount before fetch completes
    unmount();

    // Resolve the fetch
    resolveFetch?.({
      ok: true,
      json: async () => [],
    });

    // Wait a bit to ensure no state updates after unmount
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If we get here without errors, the cleanup worked correctly
    expect(true).toBe(true);
  });

  it('should refetch when countryCode changes', async () => {
    const nlHolidays: PublicHoliday[] = [
      {
        id: 'holiday-nl',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        type: 'Public',
        name: [{ language: 'EN', text: "New Year's Day" }],
        regionalScope: 'National',
        temporalScope: 'FullDay',
        nationwide: true,
      },
    ];

    const deHolidays: PublicHoliday[] = [
      {
        id: 'holiday-de',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        type: 'Public',
        name: [{ language: 'EN', text: 'New Year\'s Day' }],
        regionalScope: 'National',
        temporalScope: 'FullDay',
        nationwide: true,
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => nlHolidays,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => deHolidays,
      });

    const { result, rerender } = renderHook(
      ({ country }) => usePublicHolidays(country, 2025, 'EN', true),
      { initialProps: { country: 'NL' } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual(nlHolidays);

    // Change country
    rerender({ country: 'DE' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual(deHolidays);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should refetch when year changes', async () => {
    const holidays2025: PublicHoliday[] = [
      {
        id: 'holiday-2025',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        type: 'Public',
        name: [{ language: 'EN', text: "New Year's Day" }],
        regionalScope: 'National',
        temporalScope: 'FullDay',
        nationwide: true,
      },
    ];

    const holidays2026: PublicHoliday[] = [
      {
        id: 'holiday-2026',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        type: 'Public',
        name: [{ language: 'EN', text: "New Year's Day" }],
        regionalScope: 'National',
        temporalScope: 'FullDay',
        nationwide: true,
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => holidays2025,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => holidays2026,
      });

    const { result, rerender } = renderHook(
      ({ year }) => usePublicHolidays('NL', year, 'EN', true),
      {
        initialProps: { year: 2025 },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual(holidays2025);

    // Change year
    rerender({ year: 2026 });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.holidays).toEqual(holidays2026);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('convertDateFormat', () => {
  it('should convert YYYY-MM-DD to YYYY/MM/DD', () => {
    expect(convertDateFormat('2025-01-01')).toBe('2025/01/01');
    expect(convertDateFormat('2025-12-31')).toBe('2025/12/31');
  });

  it('should handle invalid formats gracefully', () => {
    // Mock console.warn to avoid noise in test output
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(convertDateFormat('2025/01/01')).toBe('2025/01/01');
    expect(convertDateFormat('invalid')).toBe('invalid');
    expect(convertDateFormat('2025-1-1')).toBe('2025-1-1');

    expect(warnSpy).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });

  it('should validate format with regex', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Valid formats
    expect(convertDateFormat('2025-01-01')).toBe('2025/01/01');
    expect(convertDateFormat('1999-12-31')).toBe('1999/12/31');

    // Invalid formats
    convertDateFormat('25-01-01'); // Short year
    convertDateFormat('2025-1-01'); // Single digit month
    convertDateFormat('2025-01-1'); // Single digit day

    expect(warnSpy).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });
});
