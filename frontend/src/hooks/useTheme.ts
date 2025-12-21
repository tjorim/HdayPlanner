import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'hday-theme'
const THEME_ATTRIBUTE = 'data-theme'

/**
 * Custom hook for managing application theme (light/dark mode).
 * Persists theme preference to localStorage and applies it to document root.
 * Respects system preference (prefers-color-scheme) when no stored preference exists.
 * 
 * @returns Object containing current theme and toggle function
 * 
 * @example
 * ```tsx
 * const { theme, toggleTheme } = useTheme()
 * 
 * <button onClick={toggleTheme}>
 *   {theme === 'light' ? '🌙' : '☀️'}
 * </button>
 * ```
 */
export function useTheme() {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
    
    // Fallback to system preference if available
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return 'light'
  })

  // Apply theme to document root whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])

  return { theme, toggleTheme }
}
