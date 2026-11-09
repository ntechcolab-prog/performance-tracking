import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '../../../helpers/cn'
import { tcl } from '../../../helpers/tcl'
import { LineChart } from '../LineChart'

export type KPIStatus = 'neutral' | 'success' | 'warning' | 'danger'

export interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  /** Change indicator. Color follows `direction` (up = success, down = danger). */
  delta?: { value: number; direction: 'up' | 'down' }
  /** Optional trend data rendered as a small sparkline (no axes/grid). */
  trend?: { x: number | string; y: number }[]
  /** Status accent shown as a left rail and sparkline color. Default neutral. */
  status?: KPIStatus
  className?: string
}

const RAIL: Record<KPIStatus, string> = {
  neutral: 'bg-border-strong',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

const SPARK: Record<KPIStatus, string> = {
  neutral: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
}

/**
 * A single KPI / metric tile: a label, a big value (+optional unit), an optional
 * up/down delta badge, and an optional sparkline of recent trend. Built on the
 * Card surface tokens.
 */
export function KPICard({
  label,
  value,
  unit,
  delta,
  trend,
  status = 'neutral',
  className,
}: KPICardProps) {
  const up = delta?.direction === 'up'
  const DeltaIcon = up ? ArrowUp : ArrowDown

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-card border border-border',
        'bg-surface-raised p-4 shadow-sm',
        className,
      )}
      {...tcl('KPICard', { label, value, unit, status })}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', RAIL[status])} />

      <div className="flex items-start justify-between gap-2 pl-1">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-round px-1.5 py-0.5 text-xs font-medium',
              up ? 'bg-accent-subtle text-accent' : 'bg-surface-sunken text-danger',
            )}
          >
            <DeltaIcon className="size-3" aria-hidden />
            <span>
              {delta.value > 0 ? '+' : ''}
              {delta.value}%
            </span>
            <span className="sr-only">{up ? 'increase' : 'decrease'}</span>
          </span>
        )}
      </div>

      <div className="flex items-end gap-1 pl-1">
        <span className="text-3xl font-semibold leading-none text-text tabular-nums">{value}</span>
        {unit && <span className="pb-0.5 text-sm text-text-muted">{unit}</span>}
      </div>

      {trend && trend.length > 1 && (
        <div className="pl-1">
          <LineChart
            sparkline
            height={40}
            series={[{ name: label, color: SPARK[status], points: trend }]}
          />
        </div>
      )}
    </div>
  )
}
