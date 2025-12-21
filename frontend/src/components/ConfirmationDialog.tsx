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
 * Displays an accessible confirmation dialog when open.
 *
 * The dialog traps keyboard focus and exposes ARIA attributes for the title and description.
 * It can be dismissed by clicking the backdrop or pressing the Escape key, and provides confirm and cancel action buttons.
 *
 * @param isOpen - Whether the dialog is currently open; when false, nothing is rendered.
 * @param title - The title text displayed at the top of the dialog.
 * @param message - The main message or description shown inside the dialog body.
 * @param confirmLabel - Optional label for the primary confirm button (defaults to "Confirm").
 * @param cancelLabel - Optional label for the secondary cancel button (defaults to "Cancel").
 * @param onConfirm - Callback invoked when the confirm button is clicked.
 * @param onCancel - Callback invoked when the dialog is dismissed (cancel button, backdrop click, or Escape key).
 * @returns The dialog's JSX element when `isOpen` is true, otherwise `null`.
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