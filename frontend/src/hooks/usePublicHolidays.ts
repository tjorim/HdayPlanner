import { useEffect, useState } from 'react';

export interface PublicHolidayName {
  language: string;
  text: string;
}

export interface PublicHoliday {
  id: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  type: string;
  name: PublicHolidayName[];
  regionalScope: string;
  temporalScope: string;
  nationwide: boolean;
}

const DEFAULT_LANGUAGE = 'EN';

export function getPublicHolidayName(
  holiday: PublicHoliday,
  language: string = DEFAULT_LANGUAGE,
) {
  const match = holiday.name.find((entry) => entry.language === language);
  if (match?.text) {
    return match.text;
  }
  return holiday.name[0]?.text ?? 'Public Holiday';
}

/**
 * Hook to fetch public holidays from OpenHolidays API
 * @param countryCode ISO 3166-1 alpha-2 country code (e.g., 'US', 'NL', 'DE')
 * @param year Year to fetch holidays for
 * @param language Language code for holiday names (default: 'EN')
 * @param enabled Whether to fetch holidays (for conditional loading)
 * @returns Object with holidays array, loading state, and error
 */
export function usePublicHolidays(
  countryCode: string,
  year: number,
  language: string = DEFAULT_LANGUAGE,
  enabled: boolean = true,
) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
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
          `https://openholidaysapi.org/PublicHolidays?countryIsoCode=${countryCode}` +
            `&validFrom=${year}-01-01&validTo=${year}-12-31` +
            `&languageIsoCode=${language}`,
          {
            headers: {
              Accept: 'application/json',
            },
            // Timeout after 10 seconds
            signal: AbortSignal.timeout(10000),
          },
        );

        if (!cancelled && !response.ok) {
          throw new Error(`Failed to fetch holidays: ${response.status} ${response.statusText}`);
        }

        if (cancelled) {
          return;
        }

        const data: PublicHoliday[] = await response.json();

        if (!cancelled) {
          setHolidays(data);
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
  }, [countryCode, year, language, enabled]);

  return { holidays, loading, error };
}

/**
 * Convert a date string from API format to .hday format.
 *
 * @param apiDate - Date string in `YYYY-MM-DD` format
 * @returns The date string converted to `YYYY/MM/DD` format; returns the original string unchanged if the input does not match `YYYY-MM-DD` format.
 */
export function convertDateFormat(apiDate: string): string {
  // Basic validation: ensure format is YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
    console.warn(`Invalid date format: ${apiDate}. Expected YYYY-MM-DD format.`);
    return apiDate;
  }
  return apiDate.replace(/-/g, '/');
}
