import { useEffect, useState, useCallback } from 'react'

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

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = toastIdCounter++
    const newToast: Toast = { id, message, type }
    
    setToasts(prev => [...prev, newToast])

    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [duration])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}
