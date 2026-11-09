import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../../helpers/cn'
import { tcl } from '../../../helpers/tcl'
import { ChartTooltip, describeSlice, paletteColor } from '../primitives'

export interface DonutDatum {
  label: string
  value: number
  /** CSS color. Defaults to the categorical palette by index. */
  color?: string
}

export interface DonutChartProps {
  data: DonutDatum[]
  /** Pixel width/height of the square SVG. Default 240. */
  size?: number
  /**
   * Inner radius as a fraction (0–1) of the outer radius. `0` renders a pie,
   * `> 0` a donut (default 0.6). The donut hole hosts `centerLabel`.
   */
  innerRadius?: number
  /** Show the swatch + value legend beside the ring. Default true. */
  showLegend?: boolean
  /** Content for the donut hole (e.g. a total). Ignored when innerRadius is 0. */
  centerLabel?: React.ReactNode
  formatValue?: (n: number) => string
  className?: string
}

const GAP_DEG = 1.5 // tiny gap between slices for separation

/**
 * A donut / pie chart drawn as inline SVG arc slices — no chart library. Set
 * `innerRadius={0}` for a pie; any positive fraction yields a donut whose hole
 * can show a `centerLabel`. Slices animate in with a clockwise sweep; hovering a
 * slice raises it and dims the rest while a tooltip shows label, value and
 * percent. The full data (with percentages) is exposed to assistive tech via an
 * `sr-only` table.
 */
export function DonutChart({
  data,
  size = 240,
  innerRadius = 0.6,
  showLegend = true,
  centerLabel,
  formatValue = (n) => String(n),
  className,
}: DonutChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const devAttrs = tcl('DonutChart', { size, innerRadius, showLegend })

  const slices = data.filter((d) => d.value > 0)
  const total = slices.reduce((sum, d) => sum + d.value, 0)

  const colorOf = (d: DonutDatum, i: number) => d.color ?? paletteColor(i)
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)

  if (slices.length === 0 || total === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-sm text-text-muted', className)}
        style={{ width: size, height: size }}
        role="img"
        aria-label="Donut chart with no data"
        {...devAttrs}
      >
        No data to display
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 6 // small inset so a raised slice isn't clipped
  const innerR = Math.max(0, Math.min(0.95, innerRadius)) * outerR
  const isDonut = innerR > 0

  // Pre-compute each slice's angular span. A single 100% slice draws a full ring
  // (clamped just under 360° so start ≠ end), with no separating gap.
  const single = slices.length === 1
  let cursor = 0
  const arcs = slices.map((d, i) => {
    const sweep = pct(d.value) * 3.6
    const gap = single ? 0 : GAP_DEG
    const start = cursor + gap / 2
    const end = cursor + sweep - gap / 2
    cursor += sweep
    return {
      datum: d,
      index: i,
      start,
      end: single ? 359.999 : Math.max(start, end),
    }
  })

  const summary =
    `${isDonut ? 'Donut' : 'Pie'} chart of ${slices.length} categories totalling ${formatValue(total)}: ` +
    arcs
      .map((a) => `${a.datum.label} ${formatValue(a.datum.value)} (${pct(a.datum.value).toFixed(1)}%)`)
      .join(', ') +
    '.'

  return (
    <figure className={cn('m-0 flex flex-wrap items-center gap-x-6 gap-y-3', className)} {...devAttrs}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          role="img"
          aria-label={summary}
          onMouseLeave={() => setHover(null)}
        >
          {arcs.map((a) => {
            const raised = hover === a.index
            const dim = hover !== null && hover !== a.index
            const color = colorOf(a.datum, a.index)
            return (
              <motion.path
                key={a.datum.label}
                d={describeSlice(cx, cy, innerR, raised ? outerR + 4 : outerR, a.start, a.end)}
                fill={color}
                stroke="var(--color-surface)"
                strokeWidth={isDonut ? 0 : 1}
                style={{ opacity: dim ? 0.4 : 1 }}
                className="transition-[opacity,d] duration-150"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: dim ? 0.4 : 1, scale: 1 }}
                transition={{ duration: 0.5, delay: a.index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHover(a.index)}
              />
            )
          })}
        </svg>

        {isDonut && centerLabel !== undefined && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            aria-hidden
          >
            {centerLabel}
          </div>
        )}

        {hover !== null && arcs[hover] && (
          <ChartTooltip
            x={cx}
            y={cy - outerR}
            title={arcs[hover].datum.label}
            items={[
              {
                label: 'Value',
                value: formatValue(arcs[hover].datum.value),
                color: colorOf(arcs[hover].datum, hover),
              },
              { label: 'Share', value: `${pct(arcs[hover].datum.value).toFixed(1)}%` },
            ]}
          />
        )}
      </div>

      {showLegend && (
        <ul aria-hidden className="flex min-w-32 flex-col gap-1.5">
          {arcs.map((a) => (
            <li
              key={a.datum.label}
              className="flex items-center gap-2 text-xs text-text-muted"
              onMouseEnter={() => setHover(a.index)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: colorOf(a.datum, a.index) }}
              />
              <span className="text-text">{a.datum.label}</span>
              <span className="ml-auto pl-3 font-medium text-text tabular-nums">
                {formatValue(a.datum.value)}
              </span>
              <span className="w-10 text-right tabular-nums">{pct(a.datum.value).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}

      <figcaption className="sr-only">
        {summary}
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Value</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {arcs.map((a) => (
              <tr key={a.datum.label}>
                <td>{a.datum.label}</td>
                <td>{formatValue(a.datum.value)}</td>
                <td>{pct(a.datum.value).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
