import { forwardRef, useCallback, useLayoutEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type ToolbarOrientation = 'horizontal' | 'vertical'

export interface ToolbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  orientation?: ToolbarOrientation
  /** Accessible name for the toolbar. */
  'aria-label': string
  children: ReactNode
}

// Selector for the focusable controls a roving toolbar steps through.
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Horizontal (or vertical) action bar implementing the WAI-ARIA toolbar
 * pattern: a single tab stop, with Arrow keys / Home / End moving focus across
 * the contained controls (roving tabindex). Designed to hold IconButtons,
 * Buttons, ToggleGroups, separated by `ToolbarSeparator` and clustered with
 * `ToolbarGroup`.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ orientation = 'horizontal', className, children, onKeyDown, ...rest }, ref) => {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const activeIndexRef = useRef(0)

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      },
      [ref],
    )

    const getItems = useCallback((): HTMLElement[] => {
      const root = rootRef.current
      if (!root) return []
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
    }, [])

    // Roving tabindex: keep exactly one item tabbable. Re-runs when children
    // change. Clamps the active index if items were removed.
    useLayoutEffect(() => {
      const items = getItems()
      if (items.length === 0) return
      const active = Math.min(activeIndexRef.current, items.length - 1)
      activeIndexRef.current = active
      items.forEach((el, i) => {
        el.tabIndex = i === active ? 0 : -1
      })
    })

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      onKeyDown?.(e)
      if (e.defaultPrevented) return

      const horizontal = orientation === 'horizontal'
      const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown'
      const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp'

      const items = getItems()
      if (items.length === 0) return
      const current = items.indexOf(document.activeElement as HTMLElement)

      let next = current
      switch (e.key) {
        case nextKey:
          next = current < 0 ? 0 : (current + 1) % items.length
          break
        case prevKey:
          next = current <= 0 ? items.length - 1 : current - 1
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = items.length - 1
          break
        default:
          return
      }

      e.preventDefault()
      items.forEach((el, i) => {
        el.tabIndex = i === next ? 0 : -1
      })
      activeIndexRef.current = next
      items[next]?.focus()
    }

    return (
      <div
        ref={setRefs}
        role="toolbar"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center gap-1 rounded-card border border-border bg-surface-raised p-1',
          orientation === 'vertical' && 'flex-col',
          className,
        )}
        {...tcl('Toolbar', { orientation, label: rest['aria-label'] })}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
Toolbar.displayName = 'Toolbar'

export interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** Visually clusters related controls within a Toolbar. */
export const ToolbarGroup = forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn('inline-flex items-center gap-1', className)}
      {...tcl('ToolbarGroup')}
      {...rest}
    >
      {children}
    </div>
  ),
)
ToolbarGroup.displayName = 'ToolbarGroup'

export interface ToolbarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: ToolbarOrientation
}

/** Thin divider between groups of controls. */
export const ToolbarSeparator = forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ orientation = 'vertical', className, ...rest }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'vertical' ? 'mx-1 h-6 w-px' : 'my-1 h-px w-6',
        className,
      )}
      {...tcl('ToolbarSeparator', { orientation })}
      {...rest}
    />
  ),
)
ToolbarSeparator.displayName = 'ToolbarSeparator'
