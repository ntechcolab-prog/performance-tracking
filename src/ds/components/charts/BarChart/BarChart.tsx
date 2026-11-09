import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../../helpers/cn'
import { tcl } from '../../../helpers/tcl'
import {
  ChartGrid,
  ChartAxis,
  ChartTooltip,
  ChartLegend,
  createLinearScale,
  niceTicks,
  useChartWidth,
} from '../primitives'

export interface BarDatum {
  label: string
  value: number
}

export interface BarSeries {
  name: string
  color?: string
  values: number[]
}

export interface BarChartProps {
  data: BarDatum[]
  /**
   * Grouped series. When provided, bar heights come from these series (the
   * `data` values are ignored); `data` labels are still used for the category
   * axis when present.
   */
  series?: BarSeries[]
  horizontal?: boolean
  /** Pixel height. Default 280. */
  height?: number
  /** Bar color for the single-series case. Default accent. */
  color?: string
  formatValue?: (n: number) => string
  showLegend?: boolean
  className?: string
}

const DEFAULT_COLORS = [
  'var(--color-accent)',
  'var(--color-tecblue-90)',
  'var(--color-anthracite-70)',
  'var(--color-warning)',
]

function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

function rightRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, h / 2, w))
  return `M${x},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} L${x},${y + h} Z`
}

/**
 * A bar chart drawn as inline SVG — vertical or horizontal, single or grouped
 * series. Bars share a common zero baseline (honest magnitudes), have rounded
 * leading corners, and lift the value(s) of the hovered category into a tooltip.
 */
export function BarChart({
  data,
  series,
  horizontal = false,
  height = 280,
  color = 'var(--color-accent)',
  formatValue = (n) => String(n),
  showLegend = false,
  className,
}: BarChartProps) {
  const [ref, width] = useChartWidth()
  const [hover, setHover] = useState<number | null>(null)
  const devAttrs = tcl('BarChart', { horizontal, height, showLegend })

  const grouped = series && series.length > 0
  const seriesList: BarSeries[] = grouped
    ? series!
    : [{ name: 'Value', color, values: data.map((d) => d.value) }]
  const colorOf = (s: BarSeries, i: number) =>
    s.color ?? (grouped ? DEFAULT_COLORS[i % DEFAULT_COLORS.length] : color)

  const catCount = grouped
    ? Math.max(0, ...seriesList.map((s) => s.values.length))
    : data.length
  const labels =
    data.length >= catCount && data.length > 0
      ? data.map((d) => d.label)
      : Array.from({ length: catCount }, (_, i) => String(i + 1))

  const allValues = seriesList.flatMap((s) => s.values)

  if (catCount === 0 || allValues.length === 0) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center text-sm text-text-muted', className)}
        style={{ height }}
        role="img"
        aria-label="Bar chart with no data"
        {...devAttrs}
      >
        No data to display
      </div>
    )
  }

  const dataMax = Math.max(0, ...allValues)
  const dataMin = Math.min(0, ...allValues)
  const ticks = niceTicks(dataMin, dataMax, 5)
  const vMin = ticks[0]
  const vMax = ticks[ticks.length - 1]

  const left = horizontal ? 72 : 44
  const right = width - 16
  const top = 12
  const bottom = height - 28

  // Value scale runs along y (vertical bars) or x (horizontal bars).
  const valueScale = horizontal
    ? createLinearScale({ domainMin: vMin, domainMax: vMax, rangeMin: left, rangeMax: right })
    : createLinearScale({ domainMin: vMin, domainMax: vMax, rangeMin: bottom, rangeMax: top })
  const zero = valueScale(0)

  const bandSize = (horizontal ? bottom - top : right - left) / catCount
  const bandPad = bandSize * 0.18
  const innerWidth = bandSize - bandPad * 2
  const barW = grouped ? innerWidth / seriesList.length : innerWidth

  const summary =
    `${horizontal ? 'Horizontal bar' : 'Bar'} chart of ${labels.length} categories` +
    `${grouped ? ` across ${seriesList.length} series` : ''}, ` +
    `values ranging ${formatValue(Math.min(...allValues))} to ${formatValue(Math.max(...allValues))}.`

  return (
    <figure ref={ref} className={cn('m-0 w-full', className)} {...devAttrs}>
      {showLegend && grouped && (
        <ChartLegend
          items={seriesList.map((s, i) => ({ name: s.name, color: colorOf(s, i) }))}
          className="mb-2"
        />
      )}
      <div className="relative">
        <svg width={width} height={height} role="img" aria-label={summary}>
          {horizontal ? (
            <>
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={valueScale(t)}
                  x2={valueScale(t)}
                  y1={top}
                  y2={bottom}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  aria-hidden
                />
              ))}
              <ChartAxis
                orientation="x"
                axisPos={bottom}
                start={left}
                end={right}
                ticks={ticks.map((t) => ({ label: formatValue(t), pos: valueScale(t) }))}
              />
              <ChartAxis
                orientation="y"
                axisPos={left}
                start={top}
                end={bottom}
                ticks={labels.map((label, i) => ({
                  label,
                  pos: top + bandSize * i + bandSize / 2,
                }))}
              />
            </>
          ) : (
            <>
              <ChartGrid yTicks={ticks.map((t) => valueScale(t))} left={left} right={right} />
              <ChartAxis
                orientation="y"
                axisPos={left}
                start={top}
                end={bottom}
                ticks={ticks.map((t) => ({ label: formatValue(t), pos: valueScale(t) }))}
              />
              <ChartAxis
                orientation="x"
                axisPos={bottom}
                start={left}
                end={right}
                ticks={labels.map((label, i) => ({
                  label,
                  pos: left + bandSize * i + bandSize / 2,
                }))}
              />
            </>
          )}

          {labels.map((_, ci) => {
            const bandStart = (horizontal ? top : left) + bandSize * ci + bandPad
            const dim = hover !== null && hover !== ci
            return (
              <g key={ci} style={{ opacity: dim ? 0.45 : 1 }} className="transition-opacity">
                {seriesList.map((s, si) => {
                  const v = s.values[ci] ?? 0
                  const fill = colorOf(s, si)
                  if (horizontal) {
                    const y = bandStart + barW * si
                    const x = Math.min(zero, valueScale(v))
                    const w = Math.abs(valueScale(v) - zero)
                    return (
                      <motion.path
                        key={s.name}
                        d={rightRoundedRect(x, y, Math.max(w, 0.5), Math.max(barW - 2, 1), 3)}
                        fill={fill}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: ci * 0.02, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )
                  }
                  const x = bandStart + barW * si
                  const y = Math.min(zero, valueScale(v))
                  const h = Math.abs(valueScale(v) - zero)
                  return (
                    <motion.path
                      key={s.name}
                      d={topRoundedRect(x, y, Math.max(barW - 2, 1), Math.max(h, 0.5), 3)}
                      fill={fill}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: ci * 0.02, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )
                })}
                {/* Hover hit-area spanning the whole band. */}
                <rect
                  x={horizontal ? left : (left + bandSize * ci)}
                  y={horizontal ? (top + bandSize * ci) : top}
                  width={horizontal ? right - left : bandSize}
                  height={horizontal ? bandSize : bottom - top}
                  fill="transparent"
                  onMouseEnter={() => setHover(ci)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>

        {hover !== null && (
          <ChartTooltip
            x={horizontal ? right - 8 : left + bandSize * hover + bandSize / 2}
            y={horizontal ? top + bandSize * hover + bandSize / 2 : top + 4}
            title={labels[hover]}
            items={seriesList.map((s, i) => ({
              label: s.name,
              value: formatValue(s.values[hover] ?? 0),
              color: colorOf(s, i),
            }))}
          />
        )}
      </div>

      <figcaption className="sr-only">
        {summary}
        <table>
          <thead>
            <tr>
              <th>Category</th>
              {seriesList.map((s) => (
                <th key={s.name}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, ci) => (
              <tr key={ci}>
                <td>{label}</td>
                {seriesList.map((s) => (
                  <td key={s.name}>{formatValue(s.values[ci] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
