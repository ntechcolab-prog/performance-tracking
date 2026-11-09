import { cn } from '../../../helpers/cn'

export interface ChartTooltipItem {
  label: string
  value: string
  /** Swatch color (CSS color). Omit for no swatch. */
  color?: string
}

export interface ChartTooltipProps {
  /** Pixel x within the (relatively-positioned) chart container. */
  x: number
  /** Pixel y within the chart container — the tooltip floats above this. */
  y: number
  title?: string
  items: ChartTooltipItem[]
  className?: string
}

/**
 * A floating tooltip box for the hovered data point. Rendered as an HTML overlay
 * (not SVG) so text wraps and inherits type styles; place it inside a
 * `position: relative` chart container. Purely visual — `aria-hidden` — because
 * the data is already exposed via the chart's accessible summary/table.
 */
export function ChartTooltip({ x, y, title, items, className }: ChartTooltipProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full',
        'rounded-sm border border-border bg-surface-raised px-2.5 py-1.5 shadow-md',
        'whitespace-nowrap',
        className,
      )}
      style={{ left: x, top: y - 10 }}
    >
      {title && <p className="mb-1 text-[11px] font-medium text-text-muted">{title}</p>}
      <ul className="flex flex-col gap-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs">
            {item.color && (
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-text-muted">{item.label}</span>
            <span className="ml-auto pl-3 font-medium text-text tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
