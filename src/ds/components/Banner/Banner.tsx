import { useState, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { IconButton } from '../IconButton/IconButton'

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger'

export interface BannerProps {
  variant: BannerVariant
  title?: string
  children?: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  /** Overrides the default per-variant icon. Pass `null` to hide it. */
  icon?: ReactNode
  className?: string
}

// Tints pair a light `*-subtle` background with dark `text-text` (passes AA);
// the hue is carried by the left border and the icon.
const styles: Record<BannerVariant, { surface: string; border: string; icon: string }> = {
  info: { surface: 'bg-info-subtle', border: 'border-info', icon: 'text-info' },
  success: { surface: 'bg-success-subtle', border: 'border-success', icon: 'text-success' },
  warning: { surface: 'bg-warning-subtle', border: 'border-warning', icon: 'text-warning' },
  danger: { surface: 'bg-danger-subtle', border: 'border-danger', icon: 'text-danger' },
}

const defaultIcons: Record<BannerVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
}

export function Banner({
  variant,
  title,
  children,
  dismissible,
  onDismiss,
  icon,
  className,
}: BannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const s = styles[variant]
  const DefaultIcon = defaultIcons[variant]
  const showIcon = icon !== null

  function handleDismiss() {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      role={variant === 'warning' || variant === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-card border-l-4 px-4 py-3 text-sm text-text',
        s.surface,
        s.border,
        className,
      )}
      {...tcl('Banner', { variant, title, dismissible })}
    >
      {showIcon && (
        <span aria-hidden className={cn('mt-0.5 shrink-0', s.icon)}>
          {icon ?? <DefaultIcon className="size-5" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-text">{title}</p>}
        {children && <div className={cn('text-text', title && 'mt-0.5')}>{children}</div>}
      </div>
      {dismissible && (
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Dismiss"
          icon={<X className="size-4" />}
          onClick={handleDismiss}
          className="-mr-1.5 -mt-1 shrink-0 hover:bg-black/5"
        />
      )}
    </div>
  )
}
