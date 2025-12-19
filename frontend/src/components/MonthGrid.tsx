import React, { useEffect, useRef, useState } from 'react'
import type { HdayEvent } from '../lib/hday'
import { getHalfDaySymbol, getEventClass } from '../lib/hday'

interface EventItemProps {
  event: HdayEvent
}

function EventItem({ event }: EventItemProps) {
  const eventClass = getEventClass(event.flags)
  const symbol = getHalfDaySymbol(event.flags)

  // Generate accessible label for half-day symbols
  // getHalfDaySymbol only returns ◐ (AM), ◑ (PM) or '' (no symbol)
  const halfDayLabel =
    symbol === '◐' ? 'Morning half-day event' :
    symbol === '◑' ? 'Afternoon half-day event' :
    undefined
  
  return (
    <div 
      className={`event-item ${eventClass}`}
    >
      {symbol && (
        // getHalfDaySymbol only returns ◐ (AM), ◑ (PM) or '' (no symbol),
        // so we provide a consistent accessible name and role.
        <span
          className="half-day-symbol"
          aria-label={halfDayLabel}
          role="img"
        >
          {symbol}
        </span>
      )}
      {event.title || 'Event'}
    </div>
  )
}

export function MonthGrid({ events, ym }: { events: HdayEvent[]; ym: string }){
  const [year, month] = ym.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const pad2 = (n: number) => String(n).padStart(2, '0')

  // Get today's date in YYYY/MM/DD format for comparison
  const today = new Date()
  const todayStr = `${today.getFullYear()}/${pad2(today.getMonth() + 1)}/${pad2(today.getDate())}`

  const leadingPad = first.getDay() // 0..6 (Sun..Sat)
  const totalDays = last.getDate()
  const firstDayIndex = leadingPad

  // Roving tabindex: track which day-cell has focus
  const [focusedIndex, setFocusedIndex] = useState<number>(firstDayIndex)
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    // Reset focus to first real day when month changes
    setFocusedIndex(firstDayIndex)
    // Focus the first real day
    const el = cellRefs.current[firstDayIndex]
    el?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym])

  const clampToRealDay = (idx: number) => {
    const min = leadingPad
    const max = leadingPad + totalDays - 1
    return Math.min(Math.max(idx, min), max)
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    let next: number
    switch (e.key) {
      case 'ArrowLeft':
        next = focusedIndex - 1
        break
      case 'ArrowRight':
        next = focusedIndex + 1
        break
      case 'ArrowUp':
        next = focusedIndex - 7
        break
      case 'ArrowDown':
        next = focusedIndex + 7
        break
      case 'Home':
        next = leadingPad
        break
      case 'End':
        next = leadingPad + totalDays - 1
        break
      default:
        return // ignore other keys
    }
    e.preventDefault()
    const clamped = clampToRealDay(next)
    setFocusedIndex(clamped)
    cellRefs.current[clamped]?.focus()
  }

  const rows = Math.ceil((leadingPad + totalDays) / 7)

  const rowElements: JSX.Element[] = []
  for (let r = 0; r < rows; r++) {
    const rowCells: JSX.Element[] = []
    for (let c = 0; c < 7; c++) {
      const i = r * 7 + c
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
          />
        )
        continue
      }

      // Real day
      const d = i - leadingPad + 1
      const dateStr = `${year}/${pad2(month)}/${pad2(d)}`
      const isToday = dateStr === todayStr
      const todays = events.filter(
        (ev) => ev.type === 'range' && ev.start && ev.end && dateStr >= ev.start && dateStr <= ev.end
      )
      rowCells.push(
        <div
          className={`day${isToday ? ' day--today' : ''}`}
          tabIndex={i === focusedIndex ? 0 : -1}
          aria-label={`${dateStr}${isToday ? ' (Today)' : ''}`}
          aria-current={isToday ? 'date' : undefined}
          key={`day-${i}`}
          ref={(el) => (cellRefs.current[i] = el)}
          data-index={i}
          onFocus={() => setFocusedIndex(i)}
        >
          <div className="date">{dateStr}</div>
          {todays.map((ev, k) => (
            <EventItem key={k} event={ev} />
          ))}
        </div>
      )
    }
    rowElements.push(
      <div className="calendar-row" key={`row-${r}`}>{rowCells}</div>
    )
  }

  return (
    <div
      className="calendar"
      onKeyDown={handleKeyDown}
    >
      {rowElements}
    </div>
  )
}
