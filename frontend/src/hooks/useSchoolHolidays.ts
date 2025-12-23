import { useEffect, useState } from 'react';

export interface SchoolHolidayName {
  language: string;
  text: string;
}

export interface SchoolHolidaySubdivision {
  code: string;
  shortName?: string;
}

export interface SchoolHoliday {
  id: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  type: string;
  name: SchoolHolidayName[];
  regionalScope: string;
  temporalScope: string;
  nationwide: boolean;
  subdivisions: SchoolHolidaySubdivision[];
}

const DEFAULT_LANGUAGE = 'EN';

export function getSchoolHolidayName(holiday: SchoolHoliday, language: string = DEFAULT_LANGUAGE) {
  const match = holiday.name.find((entry) => entry.language === language);
  if (match?.text) {
    return match.text;
  }
  return holiday.name[0]?.text ?? 'School Holiday';
}

/**
 * Hook to fetch school holidays from OpenHolidays API.
 *
 * @param countryCode ISO 3166-1 alpha-2 country code (e.g., 'NL')
 * @param year Year to fetch holidays for
 * @param subdivisionCode ISO 3166-2 subdivision code (e.g., 'NL-NH')
 * @param language Language code for holiday names (default: 'EN')
 * @param enabled Whether to fetch holidays (for conditional loading)
 * @returns Object with holidays array, loading state, and error
 */
export function useSchoolHolidays(
  countryCode: string,
  year: number,
  subdivisionCode: string,
  language: string = DEFAULT_LANGUAGE,
  enabled: boolean = true,
) {
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isValidYear = Number.isInteger(year) && year >= 1000 && year <= 9999;
    if (!enabled || !countryCode || !subdivisionCode || !isValidYear) {
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
          `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=${countryCode}` +
            `&validFrom=${year}-01-01&validTo=${year}-12-31` +
            `&languageIsoCode=${language}&subdivisionCode=${subdivisionCode}`,
          {
            headers: {
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10000),
          },
        );

        if (!cancelled && !response.ok) {
          throw new Error(`Failed to fetch school holidays: ${response.status} ${response.statusText}`);
        }

        if (cancelled) {
          return;
        }

        const data: SchoolHoliday[] = await response.json();

        if (!cancelled) {
          setHolidays(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof Error) {
            if (err.name === 'AbortError' || err.name === 'TimeoutError') {
              setError('Request timeout: Unable to reach school holiday API');
            } else if (err.message.startsWith('Failed to fetch school holidays:')) {
              setError(err.message);
            } else if (err.message.includes('Failed to fetch')) {
              setError('Network error: Unable to connect to school holiday API');
            } else {
              setError(err.message);
            }
          } else {
            setError('Failed to fetch school holidays');
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
  }, [countryCode, year, subdivisionCode, language, enabled]);

  return { holidays, loading, error };
}
