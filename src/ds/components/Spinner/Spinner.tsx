import { Loader2 } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  /** Accessible label announced to assistive tech. Default "Loading". */
  label?: string
  className?: string
}

const sizes: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
}

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn('inline-flex text-accent', className)}
      {...tcl('Spinner', { size, label })}
    >
      <Loader2 className={cn('animate-spin', sizes[size])} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}
