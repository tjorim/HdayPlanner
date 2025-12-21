import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { HdayEvent } from '../lib/hday';
import { getEventClass, getHalfDaySymbol } from '../lib/hday';

interface NationalHolidayInfo {
  name: string;
  localName: string;
}

interface EventItemProps {
  event: HdayEvent;
}

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
  const symbol = getHalfDaySymbol(event.flags);

  // Generate accessible label for half-day symbols
  // getHalfDaySymbol only returns ◐ (AM), ◑ (PM) or '' (no symbol)
  const halfDayLabel =
    symbol === '◐'
      ? 'Morning half-day event'
      : symbol === '◑'
        ? 'Afternoon half-day event'
        : undefined;

  return (
    <div className={`event-item ${eventClass}`}>
      {symbol && (
        // getHalfDaySymbol only returns ◐ (AM), ◑ (PM) or '' (no symbol),
        // so we provide a consistent accessible name and role.
        <span className="half-day-symbol" aria-label={halfDayLabel} role="img">
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
 * @returns The calendar grid as a JSX element containing week rows and day cells.
 */
export function MonthGrid({
  events,
  ym,
  nationalHolidays = new Map(),
}: {
  events: HdayEvent[];
  ym: string;
  nationalHolidays?: Map<string, NationalHolidayInfo>;
}) {
  const [year, month] = ym.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Get today's date in YYYY/MM/DD format for comparison
  const today = new Date();
  const todayStr = `${today.getFullYear()}/${pad2(today.getMonth() + 1)}/${pad2(today.getDate())}`;

  const leadingPad = first.getDay(); // 0..6 (Sun..Sat)
  const totalDays = last.getDate();

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

      // Get the day of week (0 = Sunday, 6 = Saturday) for this date
      const currentDate = new Date(year, month - 1, d);
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holidayInfo = nationalHolidays.get(dateStr);

      // Build CSS classes
      const classes = ['day'];
      if (isToday) classes.push('day--today');
      if (isWeekend) classes.push('day--weekend');
      if (holidayInfo) classes.push('day--holiday');

      // Build aria-label
      let ariaLabel = dateStr;
      if (isToday) ariaLabel += ' (Today)';
      if (holidayInfo) ariaLabel += ` - ${holidayInfo.name}`;

      // Filter all events that apply to this date in a single pass
      const todays = events.filter((ev) => {
        // Range events that include this date
        if (ev.type === 'range' && ev.start && ev.end) {
          return dateStr >= ev.start && dateStr <= ev.end;
        }
        // Weekly recurring events that match this day of week
        if (ev.type === 'weekly' && ev.weekday !== undefined) {
          return ev.weekday === dayOfWeek;
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