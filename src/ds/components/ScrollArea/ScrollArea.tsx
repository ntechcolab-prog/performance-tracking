import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type ScrollOrientation = 'vertical' | 'horizontal' | 'both'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fixed height (number → px). */
  height?: number | string
  /** Maximum height before scrolling kicks in (number → px). */
  maxHeight?: number | string
  orientation?: ScrollOrientation
  children: ReactNode
}

const overflow: Record<ScrollOrientation, string> = {
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
}

// Thin, semantic-coloured scrollbars. Firefox uses `scrollbar-width`; WebKit/
// Chromium uses the pseudo-elements. Arbitrary variants keep this self-contained
// (no global CSS).
const scrollbar = cn(
  '[scrollbar-width:thin] [scrollbar-color:var(--color-border-strong)_transparent]',
  '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:rounded-round [&::-webkit-scrollbar-thumb]:bg-border-strong',
  '[&::-webkit-scrollbar-thumb]:hover:bg-text-subtle',
)

/**
 * Styled, keyboard-scrollable overflow container with thin custom scrollbars.
 * The region is focusable (`tabIndex=0`) so keyboard users can scroll it; pass
 * `role="region"` + `aria-label` for an announced landmark when appropriate.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ height, maxHeight, orientation = 'vertical', className, style, children, ...rest }, ref) => (
    <div
      ref={ref}
      tabIndex={0}
      style={{ height, maxHeight, ...style }}
      className={cn(
        'rounded-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        overflow[orientation],
        scrollbar,
        className,
      )}
      {...tcl('ScrollArea', { orientation, height, maxHeight })}
      {...rest}
    >
      {children}
    </div>
  ),
)
ScrollArea.displayName = 'ScrollArea'
