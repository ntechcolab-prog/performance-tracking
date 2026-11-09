import { forwardRef } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Icon node to render. Should be a single icon element. */
  icon: React.ReactNode
  variant?: Variant
  size?: Size
  /** Required: accessible name for the icon-only control. */
  'aria-label': string
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent',
  secondary: 'bg-surface-raised text-text border border-border-strong hover:bg-surface-sunken',
  ghost: 'bg-transparent text-text hover:bg-surface-sunken',
  danger: 'bg-danger text-on-danger hover:brightness-95',
}
const sizes: Record<Size, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = 'primary', size = 'md', className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-card font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant], sizes[size], className,
      )}
      {...tcl('IconButton', { variant, size, disabled: rest.disabled, label: rest['aria-label'] })}
      {...rest}
    >
      <span aria-hidden className="inline-flex items-center justify-center">
        {icon}
      </span>
    </button>
  ),
)
IconButton.displayName = 'IconButton'
