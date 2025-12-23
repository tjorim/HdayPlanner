import { useEffect, useRef } from 'react';

/**
 * Show a toast when an error message changes.
 *
 * @param error - Error message to watch.
 * @param messagePrefix - Prefix to display before the error message.
 * @param showToast - Toast dispatcher.
 */
export function useErrorToast(
  error: string | null,
  messagePrefix: string,
  showToast: (message: string, type: 'success' | 'error') => void,
) {
  const prevErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      showToast(`${messagePrefix}: ${error}`, 'error');
    }
    prevErrorRef.current = error;
  }, [error, messagePrefix, showToast]);
}
