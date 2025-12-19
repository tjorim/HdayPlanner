import { useEffect, RefObject } from 'react'

/**
 * Custom hook to trap focus within a container element.
 * Useful for modal dialogs to ensure keyboard navigation stays within the modal.
 * 
 * When activated, the hook will:
 * 1. Try to focus the first focusable child element (button, input, link, etc.)
 * 2. If no focusable children exist, add tabindex="-1" to the container and focus it
 * 
 * Note: The container element does not need a tabindex attribute. The hook will
 * automatically handle focus management for both containers with focusable children
 * and empty containers.
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

    // Track whether we add a tabindex to the container so we can revert on cleanup
    let addedTabIndex = false

    // Helper to get focusable elements
    const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
      const focusableSelector = [
        'button',
        '[href]',
        'input',
        'select',
        'textarea',
        '[contenteditable="true"]',
        'audio[controls]',
        'video[controls]',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ')

      const nodeList = container.querySelectorAll(focusableSelector)

      return Array.from(nodeList).filter((el) => {
        const style = window.getComputedStyle(el as Element)
        const ariaHidden = el.getAttribute('aria-hidden') === 'true'
        const tabIndex = (el as HTMLElement).tabIndex

        const isDisabled = 'disabled' in el && (el as any).disabled === true
        const isHiddenAttr = 'hidden' in el && (el as any).hidden === true

        return (
          !isDisabled &&
          !isHiddenAttr &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          ariaHidden !== true &&
          tabIndex !== -1
        )
      }) as HTMLElement[]
    }

    // Focus first focusable child or container
    const focusableElements = getFocusableElements(ref.current)
    if (focusableElements.length > 0) {
      // Focus first focusable child
      focusableElements[0].focus()
    } else {
      // No focusable children: make container focusable and focus it
      if (!ref.current.hasAttribute('tabindex')) {
        ref.current.setAttribute('tabindex', '-1')
        addedTabIndex = true
      }
      ref.current.focus()
    }

    // Focus trap handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return

      const focusableElements = getFocusableElements(ref.current)

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
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Revert tabindex only if we added it
      if (addedTabIndex && ref.current) {
        ref.current.removeAttribute('tabindex')
      }
    }
  }, [ref, isActive])
}
