import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

/**
 * Manage a list of transient toast notifications and provide controls to show or remove them.
 *
 * @param duration - Time in milliseconds before a newly shown toast is automatically removed (default: 4000)
 * @returns An object with `toasts` (the current active toasts), `showToast(message, type)` to display a new toast, and `removeToast(id)` to dismiss a toast manually
 */
export function useToast(duration: number = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      // Generate a local, non-persistent ID to avoid SSR/HMR/test leakage
      // Uses timestamp + random component (numeric) to keep type stable
      const id = Date.now() + Math.floor(Math.random() * 1_000_000);
      const newToast: Toast = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove toast after duration
      const timeoutId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutsRef.current.delete(id);
      }, duration);

      // Store timeout ID for cleanup
      timeoutsRef.current.set(id, timeoutId);
    },
    [duration],
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Clear associated timeout if exists
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  return { toasts, showToast, removeToast };
}