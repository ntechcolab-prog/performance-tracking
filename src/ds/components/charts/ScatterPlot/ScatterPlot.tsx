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
  paletteColor,
  useChartWidth,
} from '../primitives'

export interface ScatterPoint {
  x: number
  y: number
  /** Optional bubble radius in pixels. Default 4. */
  r?: number
}

export interface ScatterSeries {
  name: string
  /** CSS color. Defaults to the categorical palette by series index. */
  color?: string
  points: ScatterPoint[]
}

export interface ScatterPlotProps {
  series: ScatterSeries[]
  /** Pixel height of the chart. Default 280. */
  height?: number
  xLabel?: string
  yLabel?: string
  /** Show grid lines on both axes. Default true. */
  showGrid?: boolean
  showLegend?: boolean
  formatX?: (n: number) => string
  formatY?: (n: number) => string
  className?: string
}

/**
 * A scatter / bubble plot drawn as inline SVG — one circle per point, colored by
 * series. Both axes use "nice" linear scales; an optional per-point radius (`r`)
 * turns it into a bubble chart. Hovering a point lifts it and shows its (x, y)
 * in a tooltip. The full dataset is mirrored in an `sr-only` table for assistive
 * tech, with a descriptive summary on the chart root (`role="img"`).
 */
export function ScatterPlot({
  series,
  height = 280,
  xLabel,
  yLabel,
  showGrid = true,
  showLegend = false,
  formatX = (n) => String(n),
  formatY = (n) => String(n),
  className,
}: ScatterPlotProps) {
  const [ref, width] = useChartWidth(600)
  const [hover, setHover] = useState<{ s: number; p: number } | null>(null)
  const devAttrs = tcl('ScatterPlot', { height, xLabel, yLabel, showGrid, showLegend })

  const colorOf = (s: ScatterSeries, i: number) => s.color ?? paletteColor(i)
  const allPoints = series.flatMap((s) => s.points)

  const left = yLabel ? 52 : 44
  const right = width - 16
  const top = 12
  const bottom = height - (xLabel ? 44 : 28)

  if (allPoints.length === 0) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center text-sm text-text-muted', className)}
        style={{ height }}
        role="img"
        aria-label="Scatter plot with no data"
        {...devAttrs}
      >
        No data to display
      </div>
    )
  }

  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)
  const xTicks = niceTicks(Math.min(...xs), Math.max(...xs), 6)
  const yTicks = niceTicks(Math.min(...ys), Math.max(...ys), 5)

  const xScale = createLinearScale({
    domainMin: xTicks[0],
    domainMax: xTicks[xTicks.length - 1],
    rangeMin: left,
    rangeMax: right,
  })
  const yScale = createLinearScale({
    domainMin: yTicks[0],
    domainMax: yTicks[yTicks.length - 1],
    rangeMin: bottom,
    rangeMax: top,
  })

  const summary =
    `Scatter plot of ${series.map((s) => s.name).join(', ')} — ` +
    `${allPoints.length} point${allPoints.length === 1 ? '' : 's'}, ` +
    `x ${formatX(Math.min(...xs))} to ${formatX(Math.max(...xs))}, ` +
    `y ${formatY(Math.min(...ys))} to ${formatY(Math.max(...ys))}.`

  const active = hover ? series[hover.s]?.points[hover.p] : null

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
            <>
              <ChartGrid yTicks={yTicks.map((t) => yScale(t))} left={left} right={right} />
              {xTicks.map((t) => (
                <line
                  key={t}
                  x1={xScale(t)}
                  x2={xScale(t)}
                  y1={top}
                  y2={bottom}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  aria-hidden
                />
              ))}
            </>
          )}
          <ChartAxis
            orientation="y"
            axisPos={left}
            start={top}
            end={bottom}
            ticks={yTicks.map((t) => ({ label: formatY(t), pos: yScale(t) }))}
            title={yLabel}
          />
          <ChartAxis
            orientation="x"
            axisPos={bottom}
            start={left}
            end={right}
            ticks={xTicks.map((t) => ({ label: formatX(t), pos: xScale(t) }))}
            title={xLabel}
          />

          {series.map((s, si) => {
            const color = colorOf(s, si)
            return (
              <g key={s.name}>
                {s.points.map((p, pi) => {
                  const isHover = hover?.s === si && hover?.p === pi
                  const baseR = p.r ?? 4
                  return (
                    <motion.circle
                      key={pi}
                      cx={xScale(p.x)}
                      cy={yScale(p.y)}
                      r={isHover ? baseR + 2 : baseR}
                      fill={color}
                      fillOpacity={0.7}
                      stroke={color}
                      strokeWidth={1}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: pi * 0.01,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onMouseEnter={() => setHover({ s: si, p: pi })}
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>

        {hover && active && (
          <ChartTooltip
            x={xScale(active.x)}
            y={yScale(active.y) - (active.r ?? 4)}
            title={series[hover.s].name}
            items={[
              { label: xLabel ?? 'x', value: formatX(active.x) },
              { label: yLabel ?? 'y', value: formatY(active.y) },
            ]}
          />
        )}
      </div>

      <figcaption className="sr-only">
        {summary}
        <table>
          <thead>
            <tr>
              <th>Series</th>
              <th>{xLabel ?? 'x'}</th>
              <th>{yLabel ?? 'y'}</th>
            </tr>
          </thead>
          <tbody>
            {series.flatMap((s) =>
              s.points.map((p, pi) => (
                <tr key={`${s.name}-${pi}`}>
                  <td>{s.name}</td>
                  <td>{formatX(p.x)}</td>
                  <td>{formatY(p.y)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
