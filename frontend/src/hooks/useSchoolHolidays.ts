import { useMemo } from 'react';
import { useOpenHolidays } from './useOpenHolidays';

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
  const isValidYear = Number.isInteger(year) && year >= 1000 && year <= 9999;
  const isEnabled = enabled && Boolean(countryCode) && Boolean(subdivisionCode) && isValidYear;
  const params = useMemo(
    () => ({
      countryIsoCode: countryCode,
      validFrom: `${year}-01-01`,
      validTo: `${year}-12-31`,
      languageIsoCode: language,
      subdivisionCode,
    }),
    [countryCode, year, language, subdivisionCode],
  );

  return useOpenHolidays<SchoolHoliday>({
    endpoint: 'SchoolHolidays',
    params,
    enabled: isEnabled,
    responseErrorPrefix: 'Failed to fetch school holidays',
    timeoutError: 'Request timeout: Unable to reach school holiday API',
    networkError: 'Network error: Unable to connect to school holiday API',
    unknownError: 'Failed to fetch school holidays',
  });
}
