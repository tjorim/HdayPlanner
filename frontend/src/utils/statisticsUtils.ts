import type { EventFlag, HdayEvent, TypeFlag } from '../lib/hday';
import { dayjs } from './dateTimeUtils';

export type YearlyStatistics = {
  totalsByType: Record<TypeFlag, number>;
};

const TYPE_PRIORITY: TypeFlag[] = [
  'business',
  'weekend',
  'birthday',
  'ill',
  'course',
  'in',
  'other',
  'holiday',
];


function getPrimaryType(flags?: EventFlag[]): TypeFlag {
  if (!flags || flags.length === 0) {
    return 'holiday';
  }

  return TYPE_PRIORITY.find((type) => type !== 'holiday' && flags.includes(type)) ?? 'holiday';
}

function isHalfDay(flags?: EventFlag[]): boolean {
  if (!flags || flags.length === 0) return false;
  const hasHalfAm = flags.includes('half_am');
  const hasHalfPm = flags.includes('half_pm');
  return hasHalfAm !== hasHalfPm;
}

function getRangeDaysInYear(event: HdayEvent, yearStart: dayjs.Dayjs, yearEnd: dayjs.Dayjs): number {
  if (event.type !== 'range' || !event.start) {
    return 0;
  }

  const start = dayjs(event.start, 'YYYY/MM/DD', true);
  const end = dayjs(event.end ?? event.start, 'YYYY/MM/DD', true);

  if (!start.isValid() || !end.isValid()) {
    return 0;
  }

  const rangeStart = start.isBefore(yearStart) ? yearStart : start;
  const rangeEnd = end.isAfter(yearEnd) ? yearEnd : end;

  if (rangeEnd.isBefore(rangeStart)) {
    return 0;
  }

  const days = rangeEnd.diff(rangeStart, 'day') + 1;
  return days * (isHalfDay(event.flags) ? 0.5 : 1);
}

function getWeeklyDaysInYear(event: HdayEvent, yearStart: dayjs.Dayjs, yearEnd: dayjs.Dayjs): number {
  if (event.type !== 'weekly' || !event.weekday) {
    return 0;
  }

  let firstOccurrence = yearStart.isoWeekday(event.weekday);
  if (firstOccurrence.isBefore(yearStart)) {
    firstOccurrence = firstOccurrence.add(1, 'week');
  }

  if (firstOccurrence.isAfter(yearEnd)) {
    return 0;
  }

  const occurrences = Math.floor(yearEnd.diff(firstOccurrence, 'day') / 7) + 1;
  return occurrences * (isHalfDay(event.flags) ? 0.5 : 1);
}

export function calculateYearlyStatistics(events: HdayEvent[], year: number): YearlyStatistics {
  const totalsByType = TYPE_PRIORITY.reduce<Record<TypeFlag, number>>(
    (totals, type) => {
      totals[type] = 0;
      return totals;
    },
    {} as Record<TypeFlag, number>,
  );

  const yearStart = dayjs(`${year}-01-01`);
  const yearEnd = dayjs(`${year}-12-31`);

  for (const event of events) {
    if (event.type === 'unknown') {
      continue;
    }

    const days =
      event.type === 'weekly'
        ? getWeeklyDaysInYear(event, yearStart, yearEnd)
        : getRangeDaysInYear(event, yearStart, yearEnd);

    if (days === 0) {
      continue;
    }

    const type = getPrimaryType(event.flags);
    totalsByType[type] += days;
  }

  return { totalsByType };
}
