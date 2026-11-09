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

export interface LineSeries {
  name: string
  /** CSS color. Defaults to accent for the first series, tecblue for the next. */
  color?: string
  points: { x: number | string; y: number }[]
}

export interface LineChartProps {
  series: LineSeries[]
  /** Pixel height of the chart. Default 280. */
  height?: number
  xLabel?: string
  yLabel?: string
  showLegend?: boolean
  /** Show horizontal gridlines. Default true. */
  showGrid?: boolean
  formatY?: (n: number) => string
  /**
   * Compact mode: drop axes, grid, legend and tooltip and draw just the line(s)
   * edge-to-edge. Used for KPI sparklines.
   */
  sparkline?: boolean
  className?: string
}

const DEFAULT_COLORS = [
  'var(--color-accent)',
  'var(--color-tecblue-90)',
  'var(--color-anthracite-70)',
  'var(--color-warning)',
]

/**
 * A multi-series line chart drawn as lightweight inline SVG. Following the
 * locked data-viz rule, points are connected with STRAIGHT segments (`L`
 * commands) only — never smoothed — so no value is ever invented between
 * samples. Hovering reveals the value(s) at the nearest x.
 */
export function LineChart({
  series,
  height = 280,
  xLabel,
  yLabel,
  showLegend = false,
  showGrid = true,
  formatY = (n) => String(n),
  sparkline = false,
  className,
}: LineChartProps) {
  const [ref, width] = useChartWidth(sparkline ? 120 : 600)
  const [hover, setHover] = useState<number | null>(null)
  const devAttrs = tcl('LineChart', { height, sparkline, showLegend, showGrid, xLabel, yLabel })

  const colorOf = (s: LineSeries, i: number) => s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]

  const count = Math.max(0, ...series.map((s) => s.points.length))
  const allY = series.flatMap((s) => s.points.map((p) => p.y))

  const left = sparkline ? 2 : yLabel ? 52 : 40
  const right = width - (sparkline ? 2 : 16)
  const top = sparkline ? 3 : 12
  const bottom = height - (sparkline ? 3 : xLabel ? 44 : 28)

  if (count === 0 || allY.length === 0) {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center text-sm text-text-muted',
          className,
        )}
        style={{ height }}
        role="img"
        aria-label="Line chart with no data"
        {...devAttrs}
      >
        No data to display
      </div>
    )
  }

  const dataMin = Math.min(...allY)
  const dataMax = Math.max(...allY)
  const ticks = niceTicks(dataMin, dataMax, 5)
  const domainMin = ticks[0]
  const domainMax = ticks[ticks.length - 1]

  const yScale = createLinearScale({ domainMin, domainMax, rangeMin: bottom, rangeMax: top })
  const xScale = createLinearScale({
    domainMin: 0,
    domainMax: Math.max(1, count - 1),
    rangeMin: left,
    rangeMax: right,
  })

  // X tick labels come from the longest series; shown sparsely if crowded.
  const labelSeries = series.reduce((a, b) => (b.points.length > a.points.length ? b : a), series[0])
  const xLabels = labelSeries.points.map((p) => String(p.x))
  const labelStep = Math.ceil(count / 8)

  const summary =
    `Line chart of ${series.map((s) => s.name).join(', ')}` +
    ` across ${count} point${count === 1 ? '' : 's'},` +
    ` ranging ${formatY(dataMin)} to ${formatY(dataMax)}.`

  if (sparkline) {
    return (
      <div ref={ref} className={cn('w-full', className)} {...devAttrs}>
        <svg width={width} height={height} role="img" aria-label={summary}>
          {series.map((s, si) => (
            <path
              key={s.name}
              d={s.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.y)}`)
                .join(' ')}
              fill="none"
              stroke={colorOf(s, si)}
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
    )
  }

  return (
    <figure ref={ref} className={cn('m-0 w-full', className)} {...devAttrs}>
      {showLegend && (
        <ChartLegend
          items={series.map((s, i) => ({ name: s.name, color: colorOf(s, i) }))}
          className="mb-2"
        />
      )}
      <div className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={summary}
          onMouseLeave={() => setHover(null)}
        >
          {showGrid && (
            <ChartGrid yTicks={ticks.map((t) => yScale(t))} left={left} right={right} />
          )}
          <ChartAxis
            orientation="y"
            axisPos={left}
            start={top}
            end={bottom}
            ticks={ticks.map((t) => ({ label: formatY(t), pos: yScale(t) }))}
            title={yLabel}
          />
          <ChartAxis
            orientation="x"
            axisPos={bottom}
            start={left}
            end={right}
            ticks={xLabels
              .map((label, i) => ({ label, pos: xScale(i), i }))
              .filter(({ i }) => i % labelStep === 0)}
            title={xLabel}
          />

          {series.map((s, si) => {
            const color = colorOf(s, si)
            const d = s.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.y)}`)
              .join(' ')
            return (
              <g key={s.name}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
                {s.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={xScale(i)}
                    cy={yScale(p.y)}
                    r={hover === i ? 4 : 2.5}
                    fill={color}
                  />
                ))}
              </g>
            )
          })}

          {hover !== null && (
            <line
              x1={xScale(hover)}
              x2={xScale(hover)}
              y1={top}
              y2={bottom}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
              aria-hidden
            />
          )}

          {/* Invisible hover columns to capture the nearest x. */}
          {Array.from({ length: count }).map((_, i) => {
            const band = (right - left) / Math.max(1, count - 1)
            return (
              <rect
                key={i}
                x={xScale(i) - band / 2}
                y={top}
                width={band}
                height={bottom - top}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            )
          })}
        </svg>

        {hover !== null && (
          <ChartTooltip
            x={xScale(hover)}
            y={Math.min(...series.map((s) => (s.points[hover] ? yScale(s.points[hover].y) : bottom)))}
            title={xLabels[hover]}
            items={series
              .filter((s) => s.points[hover] !== undefined)
              .map((s, i) => ({
                label: s.name,
                value: formatY(s.points[hover].y),
                color: colorOf(s, i),
              }))}
          />
        )}
      </div>

      {/* Visually-hidden data table for assistive tech. */}
      <figcaption className="sr-only">
        {summary}
        <table>
          <thead>
            <tr>
              <th>Point</th>
              {series.map((s) => (
                <th key={s.name}>{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i}>
                <td>{xLabels[i] ?? i + 1}</td>
                {series.map((s) => (
                  <td key={s.name}>{s.points[i] ? formatY(s.points[i].y) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
