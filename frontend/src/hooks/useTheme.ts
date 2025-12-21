import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'hday-theme'
const THEME_ATTRIBUTE = 'data-theme'

/**
 * Custom hook for managing application theme (light/dark mode).
 * Persists theme preference to localStorage and applies it to document root.
 * Respects system preference (prefers-color-scheme) when no stored preference exists.
 * 
 * @returns Object containing the current theme and a toggle function. The theme is
 * initialized in this order: (1) stored localStorage value, (2) system
 * `prefers-color-scheme` setting, (3) default `'light'`.
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
    // Guard for SSR environments
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'light'
    }
    
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
    // Guard for SSR environments
    if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
      localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme])

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])

  return { theme, toggleTheme }
}
