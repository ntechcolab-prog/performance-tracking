export interface AxisTick {
  /** Text shown for this tick. */
  label: string
  /** Pixel position along the axis (x for an x-axis, y for a y-axis). */
  pos: number
}

export interface ChartAxisProps {
  orientation: 'x' | 'y'
  ticks: AxisTick[]
  /**
   * Cross-axis pixel position of the axis line: the x of a y-axis, or the y
   * (baseline) of an x-axis.
   */
  axisPos: number
  /** Start of the axis line along its own direction (pixels). */
  start: number
  /** End of the axis line along its own direction (pixels). */
  end: number
  /** Optional axis title. */
  title?: string
}

/**
 * An x or y axis: a baseline plus tick labels. Axis labels use `text-text-muted`
 * (#5c5f62) which passes WCAG AA contrast on the chart surface. Decorative
 * geometry is `aria-hidden`; the accessible summary lives on the chart root.
 */
export function ChartAxis({ orientation, ticks, axisPos, start, end, title }: ChartAxisProps) {
  const isX = orientation === 'x'
  return (
    <g aria-hidden>
      <line
        x1={isX ? start : axisPos}
        x2={isX ? end : axisPos}
        y1={isX ? axisPos : start}
        y2={isX ? axisPos : end}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      {ticks.map((t, i) => (
        <text
          key={i}
          x={isX ? t.pos : axisPos - 8}
          y={isX ? axisPos + 16 : t.pos}
          textAnchor={isX ? 'middle' : 'end'}
          dominantBaseline={isX ? 'auto' : 'middle'}
          className="fill-text-muted text-[11px]"
        >
          {t.label}
        </text>
      ))}
      {title &&
        (isX ? (
          <text
            x={(start + end) / 2}
            y={axisPos + 34}
            textAnchor="middle"
            className="fill-text-muted text-[11px] font-medium"
          >
            {title}
          </text>
        ) : (
          <text
            x={axisPos - 40}
            y={(start + end) / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${axisPos - 40}, ${(start + end) / 2})`}
            className="fill-text-muted text-[11px] font-medium"
          >
            {title}
          </text>
        ))}
    </g>
  )
}
