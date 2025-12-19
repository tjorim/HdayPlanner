import React from 'react'
import type { Toast } from '../hooks/useToast'

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: number) => void
}

/**
 * Component to display toast notifications in a fixed position on the screen.
 */
export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px'
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          style={{
            backgroundColor: getToastColor(toast.type),
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            aria-label="Close notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function getToastColor(type: string): string {
  switch (type) {
    case 'success':
      return '#10b981' // green
    case 'error':
      return '#ef4444' // red
    case 'warning':
      return '#f59e0b' // amber
    case 'info':
    default:
      return '#3b82f6' // blue
  }
}
