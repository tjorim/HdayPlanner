import { useEffect, RefObject } from 'react'

/**
 * Custom hook to trap focus within a container element.
 * Useful for modal dialogs to ensure keyboard navigation stays within the modal.
 * 
 * @param ref - React ref to the container element that should trap focus
 * @param isActive - Whether the focus trap should be active
 * 
 * @example
 * ```tsx
 * const dialogRef = useRef<HTMLDivElement>(null)
 * useFocusTrap(dialogRef, showDialog)
 * 
 * return (
 *   <div ref={dialogRef} role="dialog">
 *     <button>Close</button>
 *   </div>
 * )
 * ```
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive || !ref.current) return

    // Focus the container when activated
    ref.current.focus()

    // Focus trap handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return

      const focusableElements = ref.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        // Shift + Tab: wrap from first to last
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ref, isActive])
}
