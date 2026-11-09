import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leadingIcon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent',
  secondary: 'bg-surface-raised text-text border border-border-strong hover:bg-surface-sunken',
  ghost: 'bg-transparent text-text hover:bg-surface-sunken',
  danger: 'bg-danger text-on-danger hover:brightness-95',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leadingIcon, disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-card font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant], sizes[size], className,
      )}
      {...tcl('Button', { variant, size, loading, disabled })}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : leadingIcon}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
