import { motion } from 'motion/react'
import { cn } from '../../../helpers/cn'
import { tcl } from '../../../helpers/tcl'
import { describeArc, polarToCartesian } from '../primitives'

export interface GaugeThreshold {
  /** Lower bound (in value units) where this colored zone begins. */
  value: number
  /** CSS color for the zone from `value` up to the next threshold (or max). */
  color: string
}

export interface GaugeProps {
  value: number
  /** Domain start. Default 0. */
  min?: number
  /** Domain end. Default 100. */
  max?: number
  label?: string
  /** Unit suffix shown after the value (e.g. "%", "°C", "bar"). */
  unit?: string
  /**
   * Optional colored zones along the track. Each entry colors the arc from its
   * `value` until the next threshold (sorted ascending). When set, the value arc
   * takes the color of the zone the current value falls in.
   */
  thresholds?: GaugeThreshold[]
  /** Pixel width of the gauge. Default 220. */
  size?: number
  /** Formats the big centered value. Defaults to a rounded number. */
  format?: (n: number) => string
  /** Sweep of the gauge: a half-circle (180°) or a 270° dial. Default 180. */
  arcSpan?: 180 | 270
  className?: string
}

const TRACK_WIDTH = 14

/**
 * A radial gauge for a single value within a range, drawn as inline SVG arcs.
 * A low-contrast background track sits under a value arc that fills clockwise
 * from the start. Optional `thresholds` paint colored zones on the track and
 * tint the value arc by the zone the value lands in. Exposes `role="meter"`
 * semantics (`aria-valuenow/min/max/valuetext`) so assistive tech reads it as a
 * gauge, with a descriptive `aria-label`.
 */
export function Gauge({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  thresholds,
  size = 220,
  format = (n) => String(Math.round(n)),
  arcSpan = 180,
  className,
}: GaugeProps) {
  const span = arcSpan
  // Center the dial so its opening points down. 180° → flat top half; 270° → a
  // dial with a 90° gap at the bottom.
  const startAngle = -span / 2
  const endAngle = span / 2

  const clamped = Math.min(max, Math.max(min, value))
  const frac = max > min ? (clamped - min) / (max - min) : 0
  const valueAngle = startAngle + frac * span

  const cx = size / 2
  const radius = size / 2 - TRACK_WIDTH / 2 - 2

  // Vertical extent of the arc decides the SVG height (270° dips below center).
  const angleToY = (deg: number) => polarToCartesian(cx, cx, radius, deg).y
  const sampled = [startAngle, endAngle, ...(span > 180 ? [180] : [])]
  const maxY = Math.max(...sampled.map(angleToY)) + TRACK_WIDTH / 2 + 2
  const height = Math.ceil(maxY) + (label ? 8 : 0)

  // Sorted zones for both the track coloring and value-arc tint.
  const zones = thresholds ? [...thresholds].sort((a, b) => a.value - b.value) : []
  const valueColor =
    zones.length > 0
      ? (zones.filter((z) => clamped >= z.value).pop()?.color ??
        zones[0].color)
      : 'var(--color-accent)'

  const toAngle = (v: number) =>
    startAngle + (max > min ? (Math.min(max, Math.max(min, v)) - min) / (max - min) : 0) * span

  const valueText = `${format(clamped)}${unit ?? ''}`
  const ariaLabel =
    `${label ? `${label}: ` : ''}${valueText} of ${format(max)}${unit ?? ''}` +
    `${zones.length ? ` (${valueColor === zones[0].color ? 'lowest' : ''} zone)` : ''}`

  return (
    <figure
      className={cn('m-0 inline-flex flex-col items-center', className)}
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={Number(clamped.toFixed(3))}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={valueText}
      {...tcl('Gauge', { value, min, max, label, unit, size, arcSpan })}
    >
      <div className="relative" style={{ width: size, height }}>
        <svg width={size} height={height} aria-hidden>
          {/* Background track. */}
          <path
            d={describeArc(cx, cx, radius, startAngle, endAngle)}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={TRACK_WIDTH}
            strokeLinecap="round"
          />

          {/* Threshold zones over the track. */}
          {zones.map((z, i) => {
            const from = toAngle(z.value)
            const to = i < zones.length - 1 ? toAngle(zones[i + 1].value) : endAngle
            if (to <= from) return null
            return (
              <path
                key={i}
                d={describeArc(cx, cx, radius, from, to)}
                fill="none"
                stroke={z.color}
                strokeWidth={TRACK_WIDTH}
                strokeOpacity={0.28}
                strokeLinecap="butt"
              />
            )
          })}

          {/* Filled value arc (animates the sweep). */}
          {frac > 0 && (
            <motion.path
              d={describeArc(cx, cx, radius, startAngle, valueAngle)}
              fill="none"
              stroke={valueColor}
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </svg>

        {/* Big centered value. */}
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
          style={{ top: cx - 6, transform: 'translateY(-50%)' }}
          aria-hidden
        >
          <span className="text-3xl font-semibold tabular-nums text-text">
            {format(clamped)}
            {unit && <span className="ml-0.5 text-base font-medium text-text-muted">{unit}</span>}
          </span>
        </div>
      </div>

      {label && <figcaption className="-mt-1 text-sm text-text-muted">{label}</figcaption>}
    </figure>
  )
}
