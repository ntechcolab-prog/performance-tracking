import { useId, useState } from 'react'
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

export interface AreaSeries {
  name: string
  /** CSS color. Defaults to accent for the first series, tecblue for the next. */
  color?: string
  points: { x: number | string; y: number }[]
}

export interface AreaChartProps {
  series: AreaSeries[]
  /** Pixel height. Default 280. */
  height?: number
  xLabel?: string
  yLabel?: string
  showLegend?: boolean
  /** Show horizontal gridlines. Default true. */
  showGrid?: boolean
  formatY?: (n: number) => string
  className?: string
}

const DEFAULT_COLORS = [
  'var(--color-accent)',
  'var(--color-tecblue-90)',
  'var(--color-anthracite-70)',
]

/**
 * An area chart: a straight-segment line (locked data-viz rule — no smoothing)
 * with the region beneath filled by a low-opacity vertical gradient. Re-renders
 * cleanly when `points` change, so it suits realtime/streaming series.
 */
export function AreaChart({
  series,
  height = 280,
  xLabel,
  yLabel,
  showLegend = false,
  showGrid = true,
  formatY = (n) => String(n),
  className,
}: AreaChartProps) {
  const [ref, width] = useChartWidth()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const devAttrs = tcl('AreaChart', { height, xLabel, yLabel, showLegend, showGrid })

  const colorOf = (s: AreaSeries, i: number) => s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]

  const count = Math.max(0, ...series.map((s) => s.points.length))
  const allY = series.flatMap((s) => s.points.map((p) => p.y))

  const left = yLabel ? 52 : 40
  const right = width - 16
  const top = 12
  const bottom = height - (xLabel ? 44 : 28)

  if (count === 0 || allY.length === 0) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center text-sm text-text-muted', className)}
        style={{ height }}
        role="img"
        aria-label="Area chart with no data"
        {...devAttrs}
      >
        No data to display
      </div>
    )
  }

  const dataMin = Math.min(...allY)
  const dataMax = Math.max(...allY)
  const ticks = niceTicks(Math.min(0, dataMin), dataMax, 5)
  const domainMin = ticks[0]
  const domainMax = ticks[ticks.length - 1]

  const yScale = createLinearScale({ domainMin, domainMax, rangeMin: bottom, rangeMax: top })
  const xScale = createLinearScale({
    domainMin: 0,
    domainMax: Math.max(1, count - 1),
    rangeMin: left,
    rangeMax: right,
  })

  const labelSeries = series.reduce((a, b) => (b.points.length > a.points.length ? b : a), series[0])
  const xLabels = labelSeries.points.map((p) => String(p.x))
  const labelStep = Math.ceil(count / 8)

  const summary =
    `Area chart of ${series.map((s) => s.name).join(', ')}` +
    ` across ${count} point${count === 1 ? '' : 's'},` +
    ` ranging ${formatY(dataMin)} to ${formatY(dataMax)}.`

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
          <defs>
            {series.map((s, i) => {
              const color = colorOf(s, i)
              return (
                <linearGradient key={i} id={`area-${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              )
            })}
          </defs>

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
            const line = s.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.y)}`)
              .join(' ')
            const area =
              `M ${xScale(0)} ${bottom} ` +
              s.points.map((p, i) => `L ${xScale(i)} ${yScale(p.y)}`).join(' ') +
              ` L ${xScale(s.points.length - 1)} ${bottom} Z`
            return (
              <g key={s.name}>
                <path d={area} fill={`url(#area-${gid}-${si})`} stroke="none" />
                <path
                  d={line}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
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
            y={Math.min(
              ...series.map((s) => (s.points[hover] ? yScale(s.points[hover].y) : bottom)),
            )}
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
