export interface ChartGridProps {
  /** Pixel y positions of each horizontal gridline. */
  yTicks: number[]
  /** Left edge of the plot area (pixels). */
  left: number
  /** Right edge of the plot area (pixels). */
  right: number
}

/**
 * Low-contrast horizontal gridlines drawn at each y tick. Rendered inside an
 * SVG coordinate space and decorative only (`aria-hidden`).
 */
export function ChartGrid({ yTicks, left, right }: ChartGridProps) {
  return (
    <g aria-hidden>
      {yTicks.map((y, i) => (
        <line
          key={i}
          x1={left}
          x2={right}
          y1={y}
          y2={y}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
      ))}
    </g>
  )
}
