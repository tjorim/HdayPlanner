import React from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog component with accessibility features.
 *
 * Features:
 * - Modal overlay with backdrop
 * - Focus trap for keyboard navigation
 * - Escape key to cancel
 * - ARIA attributes for screen readers
 *
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   isOpen={showDialog}
 *   title="Confirm Delete"
 *   message="Are you sure you want to delete this item?"
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // Use focus trap hook
  useFocusTrap(dialogRef, isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="dialog-backdrop" aria-hidden="true" onClick={onCancel} />

      {/* Dialog */}
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        ref={dialogRef}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      >
        <h3 id={titleId}>{title}</h3>
        <p id={descId}>{message}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
