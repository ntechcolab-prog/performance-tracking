import { cn } from '../../../helpers/cn'

export interface ChartLegendItem {
  name: string
  color: string
}

export interface ChartLegendProps {
  items: ChartLegendItem[]
  className?: string
}

/**
 * A horizontal legend of series swatches + names. Decorative (`aria-hidden`):
 * series names are repeated in the chart's accessible summary, so screen readers
 * are not double-served.
 */
export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <ul aria-hidden className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          {item.name}
        </li>
      ))}
    </ul>
  )
}
