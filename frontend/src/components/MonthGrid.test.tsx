import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonthGrid } from './MonthGrid'
import type { HdayEvent } from '../lib/hday'

describe('MonthGrid - Today Highlighting', () => {
  // Helper to get today's date in YYYY-MM format for the component prop
  const getTodayYM = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  // Helper to get today's date in YYYY/MM/DD format
  const getTodayStr = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  it('applies day--today CSS class to today\'s date', () => {
    const events: HdayEvent[] = []
    const todayYM = getTodayYM()
    
    render(<MonthGrid events={events} ym={todayYM} />)
    
    const todayStr = getTodayStr()
    const todayCell = screen.getByLabelText(`${todayStr} (Today)`)
    
    expect(todayCell).toBeDefined()
    expect(todayCell.className).toContain('day--today')
  })

  it('applies aria-current="date" only to today\'s date', () => {
    const events: HdayEvent[] = []
    const todayYM = getTodayYM()
    
    render(<MonthGrid events={events} ym={todayYM} />)
    
    const todayStr = getTodayStr()
    const todayCell = screen.getByLabelText(`${todayStr} (Today)`)
    
    expect(todayCell.getAttribute('aria-current')).toBe('date')
  })

  it('includes "(Today)" in aria-label for today\'s date', () => {
    const events: HdayEvent[] = []
    const todayYM = getTodayYM()
    
    render(<MonthGrid events={events} ym={todayYM} />)
    
    const todayStr = getTodayStr()
    const todayCell = screen.queryByLabelText(`${todayStr} (Today)`)
    
    expect(todayCell).toBeDefined()
    expect(todayCell?.getAttribute('aria-label')).toBe(`${todayStr} (Today)`)
  })

  it('does not apply day--today class to non-today dates', () => {
    const events: HdayEvent[] = []
    const todayYM = getTodayYM()
    
    render(<MonthGrid events={events} ym={todayYM} />)
    
    // Get all day cells
    const allCells = screen.getAllByRole('generic').filter(
      el => el.className.includes('day') && !el.className.includes('calendar')
    )
    
    // Count cells with day--today class (should be exactly 1)
    const todayCells = allCells.filter(el => el.className.includes('day--today'))
    
    expect(todayCells.length).toBe(1)
  })

  it('does not apply aria-current="date" to non-today dates', () => {
    const events: HdayEvent[] = []
    const todayYM = getTodayYM()
    
    render(<MonthGrid events={events} ym={todayYM} />)
    
    // Get all day cells with aria-current="date"
    const cellsWithAriaCurrent = screen.queryAllByRole('generic').filter(
      el => el.getAttribute('aria-current') === 'date'
    )
    
    // Should only be 1 cell with aria-current="date"
    expect(cellsWithAriaCurrent.length).toBe(1)
  })

  it('does not highlight today when viewing a different month', () => {
    const events: HdayEvent[] = []
    // Use a month that's definitely not current (January 2020)
    const differentMonth = '2020-01'
    
    render(<MonthGrid events={events} ym={differentMonth} />)
    
    // Try to find any cell with "(Today)" in the label
    const todayCell = screen.queryByLabelText(/\(Today\)/)
    
    // Should not find today's date in January 2020
    expect(todayCell).toBeNull()
  })

  it('does not apply day--today class when viewing a different month', () => {
    const events: HdayEvent[] = []
    // Use a month that's definitely not current (January 2020)
    const differentMonth = '2020-01'
    
    render(<MonthGrid events={events} ym={differentMonth} />)
    
    // Get all day cells
    const allCells = screen.getAllByRole('generic').filter(
      el => el.className.includes('day') && !el.className.includes('calendar')
    )
    
    // No cells should have day--today class
    const todayCells = allCells.filter(el => el.className.includes('day--today'))
    
    expect(todayCells.length).toBe(0)
  })
})
