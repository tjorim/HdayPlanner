import type { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

/**
 * Render a fixed-position list of toast notifications.
 *
 * Each toast displays its message and a close button with appropriate ARIA labels. Error toasts
 * are rendered with role `"alert"` for immediate announcement, while non-error toasts use role
 * `"status"`.
 *
 * @param toasts - Array of toast objects to display.
 * @param onRemove - Callback invoked with the toast `id` when a toast's close button is clicked.
 * @returns The container element with rendered toasts, or `null` when `toasts` is empty.
 */
export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) =>
        toast.type === 'error' ? (
          <div
            key={toast.id}
            role="alert"
            className={`toast toast--${toast.type}`}
          >
            <span className="toast-message">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              aria-label="Close notification"
              className="toast-close-btn"
            >
              ×
            </button>
          </div>
        ) : (
          <div
            key={toast.id}
            role="status"
            className={`toast toast--${toast.type}`}
          >
            <span className="toast-message">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              aria-label="Close notification"
              className="toast-close-btn"
            >
              ×
            </button>
          </div>
        ),
      )}
    </div>
  );
}
