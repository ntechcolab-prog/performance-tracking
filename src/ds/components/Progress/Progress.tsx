import { useId } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface ProgressProps {
  value: number
  /** Upper bound of the scale. Default 100. */
  max?: number
  /** Visible label rendered above the track and used as the accessible name. */
  label?: string
  /** Shows the percentage next to the label. */
  showValue?: boolean
  className?: string
}

export function Progress({ value, max = 100, label, showValue, className }: ProgressProps) {
  const labelId = useId()
  const clamped = Math.min(Math.max(value, 0), max)
  const pct = max > 0 ? Math.round((clamped / max) * 100) : 0

  return (
    <div
      className={cn('flex flex-col gap-1.5', className)}
      {...tcl('Progress', { value, max, label, showValue })}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && (
            <span id={labelId} className="font-medium text-text">
              {label}
            </span>
          )}
          {showValue && <span className="text-text-muted">{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : 'Progress'}
        className="h-2 w-full overflow-hidden rounded-round bg-surface-sunken"
      >
        <motion.div
          className="h-full rounded-round bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}
