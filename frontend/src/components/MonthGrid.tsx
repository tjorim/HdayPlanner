import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { HdayEvent } from '../lib/hday';
import { getEventClass, getTimeLocationSymbol } from '../lib/hday';
import { dayjs, formatHdayDate, getISOWeekday, pad2 } from '../utils/dateTimeUtils';

interface NationalHolidayInfo {
  name: string;
  localName: string;
}

interface SchoolHolidayInfo {
  name: string;
}

interface EventItemProps {
  event: HdayEvent;
}

/**
 * Accessible labels for time/location symbols
 */
const SYMBOL_LABELS: Record<string, string> = {
  '◐': 'Morning half-day event',
  '◑': 'Afternoon half-day event',
  W: 'Onsite support',
  N: 'Not able to fly',
  F: 'In principle able to fly',
};

/**
 * Renders a single event item within a calendar day cell, with an optional half-day symbol.
 *
 * The component displays the event's title (falls back to "Event" if missing)
 * and, when present, a half-day symbol with an accessible label:
 * '◐' -> "Morning half-day event", '◑' -> "Afternoon half-day event".
 *
 * @param event - The HdayEvent to render; its `flags` determine CSS class and half-day symbol.
 * @returns A JSX element representing the event item.
 */
function EventItem({ event }: EventItemProps) {
  const eventClass = getEventClass(event.flags);
  const symbol = getTimeLocationSymbol(event.flags);
  const symbolLabel = symbol ? SYMBOL_LABELS[symbol] : undefined;

  return (
    <div className={`event-item ${eventClass}`}>
      {symbol && (
        <span className="half-day-symbol" aria-label={symbolLabel} role="img">
          {symbol}
        </span>
      )}
      {event.title || 'Event'}
    </div>
  );
}

/**
 * Render a month calendar grid with events and optional national holiday annotations.
 *
 * It renders each day of the month for the given year-month (`ym`) as a focusable cell.
 * Each cell displays events that occur on that date and marks today, weekends, and holidays.
 * The grid also supports keyboard navigation (Arrow keys, Home, End) with a roving tabindex.
 *
 * @param events - Array of events (HdayEvent) to be shown; events may be range or weekly types and are shown on any date they apply to.
 * @param ym - Year-month string in the format "YYYY-MM" identifying which month to render.
 * @param nationalHolidays - Optional map keyed by "YYYY/MM/DD" to holiday metadata used to mark and label holiday dates; defaults to an empty Map.
 * @param schoolHolidays - Optional map keyed by "YYYY/MM/DD" to school holiday metadata used to mark and label school holiday dates; defaults to an empty Map.
 * @returns The calendar grid as a JSX element containing week rows and day cells.
 */
export function MonthGrid({
  events,
  ym,
  nationalHolidays = new Map(),
  schoolHolidays = new Map(),
}: {
  events: HdayEvent[];
  ym: string;
  nationalHolidays?: Map<string, NationalHolidayInfo>;
  schoolHolidays?: Map<string, SchoolHolidayInfo>;
}) {
  const parts = ym.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const first = dayjs(`${year}-${pad2(month)}-01`);
  const last = first.endOf('month');

  // Get today's date in YYYY/MM/DD format for comparison
  const todayStr = formatHdayDate(dayjs());

  // Calculate leading padding for Monday-first week
  // isoWeekday(): Monday=1, Sunday=7
  // We need: Monday=0, Sunday=6 for grid positioning
  const leadingPad = first.isoWeekday() - 1; // Monday=0, Sunday=6
  const totalDays = last.date();

  // Roving tabindex: track which day-cell has focus
  const [focusedIndex, setFocusedIndex] = useState<number>(leadingPad);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    // Reset focus to first real day when month changes
    const firstDayIndex = leadingPad;
    setFocusedIndex(firstDayIndex);
    // Focus the first real day
    const el = cellRefs.current[firstDayIndex];
    el?.focus();
  }, [ym, leadingPad]);

  const clampToRealDay = (idx: number) => {
    const min = leadingPad;
    const max = leadingPad + totalDays - 1;
    return Math.min(Math.max(idx, min), max);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    let next: number;
    switch (e.key) {
      case 'ArrowLeft':
        next = focusedIndex - 1;
        break;
      case 'ArrowRight':
        next = focusedIndex + 1;
        break;
      case 'ArrowUp':
        next = focusedIndex - 7;
        break;
      case 'ArrowDown':
        next = focusedIndex + 7;
        break;
      case 'Home':
        next = leadingPad;
        break;
      case 'End':
        next = leadingPad + totalDays - 1;
        break;
      default:
        return; // ignore other keys
    }
    e.preventDefault();
    const clamped = clampToRealDay(next);
    setFocusedIndex(clamped);
    cellRefs.current[clamped]?.focus();
  };

  const rows = Math.ceil((leadingPad + totalDays) / 7);

  const rowElements: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    const rowCells: JSX.Element[] = [];
    for (let c = 0; c < 7; c++) {
      const i = r * 7 + c;
      // Leading pad or trailing pad
      if (i < leadingPad || i >= leadingPad + totalDays) {
        rowCells.push(
          <div
            className="day"
            role="presentation"
            aria-hidden="true"
            tabIndex={-1}
            key={`pad-${i}`}
            ref={(el) => (cellRefs.current[i] = el)}
            data-index={i}
          />,
        );
        continue;
      }

      // Real day
      const d = i - leadingPad + 1;
      const dateStr = `${year}/${pad2(month)}/${pad2(d)}`;
      const isToday = dateStr === todayStr;

      // Get the day of week for this date
      const currentDate = dayjs(`${year}-${pad2(month)}-${pad2(d)}`);
      const isoWeekday = getISOWeekday(currentDate); // 1=Monday, 7=Sunday for .hday format
      const isWeekend = isoWeekday === 6 || isoWeekday === 7; // Saturday=6, Sunday=7 in ISO
      const holidayInfo = nationalHolidays.get(dateStr);
      const schoolHolidayInfo = schoolHolidays.get(dateStr);

      // Build CSS classes
      const classes = ['day'];
      if (isToday) classes.push('day--today');
      if (isWeekend) classes.push('day--weekend');
      if (holidayInfo) classes.push('day--holiday');
      if (schoolHolidayInfo) classes.push('day--school-holiday');

      // Build aria-label
      let ariaLabel = dateStr;
      if (isToday) ariaLabel += ' (Today)';
      if (holidayInfo) ariaLabel += ` - ${holidayInfo.name}`;
      if (schoolHolidayInfo) ariaLabel += ` - School Holiday: ${schoolHolidayInfo.name}`;

      // Filter all events that apply to this date in a single pass
      const todays = events.filter((ev) => {
        // Range events that include this date
        if (ev.type === 'range' && ev.start && ev.end) {
          return dateStr >= ev.start && dateStr <= ev.end;
        }
        // Weekly recurring events that match this day of week (ISO: 1=Mon, 7=Sun)
        if (ev.type === 'weekly' && ev.weekday !== undefined) {
          return ev.weekday === isoWeekday;
        }
        return false;
      });
      rowCells.push(
        <div
          className={classes.join(' ')}
          tabIndex={i === focusedIndex ? 0 : -1}
          aria-label={ariaLabel}
          aria-current={isToday ? 'date' : undefined}
          key={`day-${i}`}
          ref={(el) => (cellRefs.current[i] = el)}
          data-index={i}
          onFocus={() => setFocusedIndex(i)}
        >
          <div className="date">
            {dateStr}
            {holidayInfo && (
              <span
                className="holiday-indicator"
                title={holidayInfo.localName}
                role="img"
                aria-hidden="true"
              >
                🎉
              </span>
            )}
            {schoolHolidayInfo && (
              <span
                className="school-holiday-indicator"
                title={schoolHolidayInfo.name}
                role="img"
                aria-hidden="true"
              >
                🏫
              </span>
            )}
          </div>
          {todays.map((ev) => (
            <EventItem key={ev.raw || `${ev.type}-${ev.start || ev.weekday}`} event={ev} />
          ))}
        </div>,
      );
    }
    rowElements.push(
      <div className="calendar-row" key={`row-${r}`}>
        {rowCells}
      </div>,
    );
  }

  return (
    <div className="calendar" onKeyDown={handleKeyDown}>
      {rowElements}
    </div>
  );
}
