import { useEffect, useState } from 'react';

export interface NationalHoliday {
  date: string; // YYYY-MM-DD format
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

/**
 * Hook to fetch national holidays from Nager.Date API
 * @param countryCode ISO 3166-1 alpha-2 country code (e.g., 'US', 'NL', 'DE')
 * @param year Year to fetch holidays for
 * @param enabled Whether to fetch holidays (for conditional loading)
 * @returns Object with holidays array, loading state, and error
 */
export function useNationalHolidays(
  countryCode: string,
  year: number,
  enabled: boolean = true,
) {
  const [holidays, setHolidays] = useState<NationalHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isValidYear = Number.isInteger(year) && year >= 1000 && year <= 9999;
    if (!enabled || !countryCode || !isValidYear) {
      setHolidays([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchHolidays = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
          {
            headers: {
              Accept: 'application/json',
            },
            // Timeout after 10 seconds
            signal: AbortSignal.timeout(10000),
          },
        );

        if (!cancelled && !response.ok) {
          throw new Error(
            `Failed to fetch holidays: ${response.status} ${response.statusText}`,
          );
        }

        if (cancelled) {
          return;
        }

        const data: NationalHoliday[] = await response.json();

        if (!cancelled) {
          // For Netherlands (NL), only show holidays with type "Public"
          const filteredData =
            countryCode === 'NL'
              ? data.filter((holiday) => holiday.types?.includes('Public'))
              : data;
          setHolidays(filteredData);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof Error) {
            // Check for specific error types
            if (err.name === 'AbortError' || err.name === 'TimeoutError') {
              setError('Request timeout: Unable to reach holiday API');
            } else if (err.message.startsWith('Failed to fetch holidays:')) {
              // HTTP error from response.ok check
              setError(err.message);
            } else if (err.message.includes('Failed to fetch')) {
              // Network error
              setError('Network error: Unable to connect to holiday API');
            } else {
              setError(err.message);
            }
          } else {
            setError('Failed to fetch holidays');
          }
          setHolidays([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHolidays();

    return () => {
      cancelled = true;
    };
  }, [countryCode, year, enabled]);

  return { holidays, loading, error };
}

/**
 * Convert a date string from Nager.Date format to .hday format.
 *
 * @param nagerDate - Date string in `YYYY-MM-DD` format
 * @returns The date string converted to `YYYY/MM/DD` format; returns the original string unchanged if the input does not match `YYYY-MM-DD` format.
 */
export function convertDateFormat(nagerDate: string): string {
  // Basic validation: ensure format is YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nagerDate)) {
    console.warn(
      `Invalid date format: ${nagerDate}. Expected YYYY-MM-DD format.`,
    );
    return nagerDate;
  }
  return nagerDate.replace(/-/g, '/');
}