import { useMemo } from 'react';
import { useOpenHolidays } from './useOpenHolidays';

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
  const isValidYear = Number.isInteger(year) && year >= 1000 && year <= 9999;
  const isEnabled = enabled && Boolean(countryCode) && isValidYear;
  const params = useMemo(
    () => ({
      countryIsoCode: countryCode,
      validFrom: `${year}-01-01`,
      validTo: `${year}-12-31`,
      languageIsoCode: language,
    }),
    [countryCode, year, language],
  );

  return useOpenHolidays<PublicHoliday>({
    endpoint: 'PublicHolidays',
    params,
    enabled: isEnabled,
    responseErrorPrefix: 'Failed to fetch holidays',
    timeoutError: 'Request timeout: Unable to reach holiday API',
    networkError: 'Network error: Unable to connect to holiday API',
    unknownError: 'Failed to fetch holidays',
  });
}

/**
 * Convert a date string from API format to .hday format.
 *
 * @param apiDate - Date string in `YYYY-MM-DD` format
 * @returns The date string converted to `YYYY/MM/DD` format; returns the original string unchanged if the input does not match `YYYY-MM-DD` format.
 */
