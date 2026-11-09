import { type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface EmptyStateProps {
  /** Decorative icon node, typically a lucide icon. */
  icon?: ReactNode
  title: string
  description?: string
  /** Primary action, e.g. a Button. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card px-6 py-12 text-center',
        className,
      )}
      {...tcl('EmptyState', { title })}
    >
      {icon && (
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-round bg-surface-sunken text-text-muted"
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-text">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
