import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  const THEME_KEY = 'hday-theme'
  const THEME_ATTRIBUTE = 'data-theme'

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Clear data-theme attribute
    document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  })

  afterEach(() => {
    // Clean up after each test
    localStorage.clear()
    document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  })

  it('should default to light theme when no stored preference exists', () => {
    // Mock window.matchMedia to ensure system preference doesn't interfere
    const originalMatchMedia = window.matchMedia
    const mockMatchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    window.matchMedia = mockMatchMedia as any

    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')

    // Restore original matchMedia
    window.matchMedia = originalMatchMedia
  })

  it('should load theme from localStorage if available', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
  })

  it('should toggle theme from light to dark', () => {
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('light')
    
    act(() => {
      result.current.toggleTheme()
    })
    
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('should toggle theme from dark to light', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('dark')
    
    act(() => {
      result.current.toggleTheme()
    })
    
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })

  it('should toggle theme multiple times', () => {
    const { result } = renderHook(() => useTheme())
    
    // Start with light
    expect(result.current.theme).toBe('light')
    
    // Toggle to dark
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')
    
    // Toggle back to light
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('light')
    
    // Toggle to dark again
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')
  })

  it('should handle invalid localStorage values by defaulting to light', () => {
    localStorage.setItem(THEME_KEY, 'invalid-theme')
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('light')
  })

  it('should respect system preference when no stored preference exists', () => {
    // Mock window.matchMedia to simulate dark mode system preference
    const mockMatchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    // Save original matchMedia
    const originalMatchMedia = window.matchMedia
    window.matchMedia = mockMatchMedia as any
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('dark')
    
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia
  })
})
