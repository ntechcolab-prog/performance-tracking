import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface SkeletonProps {
  className?: string
  /** Border radius. `true` → pill, or pass a token class via `className`. */
  rounded?: boolean
  /** CSS width (e.g. `'100%'`, `120`). */
  width?: string | number
  /** CSS height (e.g. `'1rem'`, `16`). */
  height?: string | number
}

export function Skeleton({ className, rounded, width, height }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse bg-surface-sunken',
        rounded ? 'rounded-round' : 'rounded-sm',
        className,
      )}
      style={{ width, height }}
      {...tcl('Skeleton', { rounded, width, height })}
    />
  )
}
