import type { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

/**
 * Component to display toast notifications in a fixed position on the screen.
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
