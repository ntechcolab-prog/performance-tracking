import { forwardRef } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

type Variant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  size?: Size
  /** Shows a small leading status dot in the variant colour. */
  dot?: boolean
}

// Surface + text pairs are tuned to pass WCAG AA, all on `*-subtle` tints.
// accent/success/danger clear 4.5:1 with their own hue as text; warning/info
// are too light for colored text, so they use dark `text-text` and let the
// dot carry the hue.
const variants: Record<Variant, string> = {
  neutral: 'bg-surface-sunken text-text-muted',
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-text',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-text',
}

const dotColors: Record<Variant, string> = {
  neutral: 'bg-text-subtle',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

const sizes: Record<Size, string> = {
  sm: 'h-5 px-2 text-xs gap-1',
  md: 'h-6 px-2.5 text-sm gap-1.5',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', dot = false, className, children, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-round font-medium whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
      {...tcl('Badge', { variant, size, dot })}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className={cn('size-1.5 shrink-0 rounded-round', dotColors[variant])}
        />
      )}
      {children}
    </span>
  ),
)
Badge.displayName = 'Badge'
