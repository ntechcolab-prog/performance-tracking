import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface DividerProps {
  /** Layout axis. Default `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'
  /** Optional centered label (horizontal only). */
  label?: string
  className?: string
}

/**
 * A thin separating rule. Horizontal renders a full-width line (optionally
 * splitting around a centered `label`); vertical renders a `self-stretch`
 * 1px line for use between inline items.
 */
export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('w-px self-stretch bg-border', className)}
        {...tcl('Divider', { orientation, label })}
      />
    )
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn('flex items-center gap-3', className)}
        {...tcl('Divider', { orientation, label })}
      >
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-xs font-medium text-text-muted">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    )
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn('h-px w-full bg-border', className)}
      {...tcl('Divider', { orientation, label })}
    />
  )
}
