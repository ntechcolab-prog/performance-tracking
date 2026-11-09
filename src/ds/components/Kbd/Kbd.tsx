import { forwardRef, Fragment } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Render a key combo, each key in its own `<kbd>` joined by a thin "+".
   * Takes precedence over `children` when provided and non-empty.
   */
  keys?: string[]
}

// Shared key look: a small, monospaced, slightly raised cap.
const keyClass =
  'inline-flex min-w-[1.5em] items-center justify-center rounded-sm border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-xs font-medium text-text-muted shadow-xs'

/**
 * Small keyboard-key visual. Pass a single key as `children` (`<Kbd>⌘</Kbd>`)
 * or a combo via `keys` (`<Kbd keys={['Ctrl','Shift','P']} />`).
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ keys, className, children, ...rest }, ref) => {
    if (keys && keys.length > 0) {
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          className={cn('inline-flex items-center gap-1', className)}
          {...tcl('Kbd')}
          {...rest}
        >
          {keys.map((k, i) => (
            <Fragment key={`${k}-${i}`}>
              {i > 0 && (
                <span aria-hidden className="text-xs text-text-muted">
                  +
                </span>
              )}
              <kbd className={keyClass}>{k}</kbd>
            </Fragment>
          ))}
        </span>
      )
    }

    return (
      <kbd ref={ref} className={cn(keyClass, className)} {...tcl('Kbd')} {...rest}>
        {children}
      </kbd>
    )
  },
)
Kbd.displayName = 'Kbd'
