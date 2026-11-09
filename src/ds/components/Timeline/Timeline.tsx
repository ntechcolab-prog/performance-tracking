import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type TimelineStatus = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface TimelineItem {
  id: string
  title: ReactNode
  description?: ReactNode
  timestamp?: string
  /** Optional icon rendered inside the node instead of a plain dot. */
  icon?: ReactNode
  status?: TimelineStatus
}

export interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[]
  /** Tighter vertical rhythm and smaller nodes. */
  compact?: boolean
}

// Status is carried by the node colour only, so the text stays on AA-safe
// neutral tokens regardless of status.
const dotColors: Record<TimelineStatus, string> = {
  default: 'bg-text-subtle',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

const iconColors: Record<TimelineStatus, string> = {
  default: 'text-text-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

/**
 * Vertical activity feed. Each event renders a status-coloured node on a shared
 * connector line, with a title and optional description + timestamp.
 */
export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(
  ({ items, compact = false, className, ...rest }, ref) => {
    const nodeSize = compact ? 'size-5' : 'size-6'

    return (
      <ol
        ref={ref}
        className={cn('relative', className)}
        {...tcl('Timeline', { compact })}
        {...rest}
      >
        {items.map((item, i) => {
          const status = item.status ?? 'default'
          const last = i === items.length - 1
          return (
            <li key={item.id} className="flex gap-3">
              {/* Node + connector column */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-round',
                    nodeSize,
                    item.icon
                      ? 'border border-border bg-surface-raised'
                      : '',
                  )}
                >
                  {item.icon ? (
                    <span aria-hidden className={cn('inline-flex', iconColors[status])}>
                      {item.icon}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        'rounded-round ring-4 ring-surface',
                        compact ? 'size-2' : 'size-2.5',
                        dotColors[status],
                      )}
                    />
                  )}
                </span>
                {!last && <span aria-hidden className="w-px flex-1 bg-border" />}
              </div>

              {/* Content */}
              <div className={cn('min-w-0 flex-1', last ? 'pb-0' : compact ? 'pb-4' : 'pb-6')}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={cn('font-medium text-text', compact && 'text-sm')}>
                    {item.title}
                  </span>
                  {item.timestamp && (
                    <span className="text-xs text-text-muted">{item.timestamp}</span>
                  )}
                </div>
                {item.description && (
                  <div className={cn('mt-0.5 text-text-muted', compact ? 'text-xs' : 'text-sm')}>
                    {item.description}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    )
  },
)
Timeline.displayName = 'Timeline'
