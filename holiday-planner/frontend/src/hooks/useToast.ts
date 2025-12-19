import { useState, useCallback, useEffect, useRef } from 'react'

export type ToastType = 'info' | 'success' | 'error' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastIdCounter = 0

/**
 * Custom hook for managing toast notifications.
 * Provides a non-blocking way to show user feedback messages.
 * 
 * @param duration - How long toasts should be visible in milliseconds (default: 4000)
 * 
 * @example
 * ```tsx
 * const { toasts, showToast } = useToast()
 * 
 * showToast('Successfully saved!', 'success')
 * showToast('An error occurred', 'error')
 * ```
 */
export function useToast(duration: number = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = toastIdCounter++
    const newToast: Toast = { id, message, type }
    
    setToasts(prev => [...prev, newToast])

    // Auto-remove toast after duration
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timeoutsRef.current.delete(id)
    }, duration)

    // Store timeout ID for cleanup
    timeoutsRef.current.set(id, timeoutId)
  }, [duration])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    // Clear associated timeout if exists
    const timeoutId = timeoutsRef.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(id)
    }
  }, [])

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutsRef.current.clear()
    }
  }, [])

  return { toasts, showToast, removeToast }
}
