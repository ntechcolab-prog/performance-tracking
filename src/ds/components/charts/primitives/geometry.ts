/**
 * Pure polar-geometry helpers for radial charts (donut, pie, gauge). No React,
 * no DOM — kept dependency-free so they are trivially unit-testable and reusable.
 *
 * Angle convention: degrees, measured CLOCKWISE from 12 o'clock (top). So 0° is
 * the top, 90° the right, 180° the bottom, 270° the left. This matches how pie
 * slices and gauges are read and keeps SVG arc sweeps positive (sweep-flag 1).
 */

export interface Point {
  x: number
  y: number
}

/** Rounds to 3 decimals to keep generated path strings compact and stable. */
function r3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Converts a polar coordinate (center, radius, angle) to a cartesian point in
 * SVG space (y grows downward). `angleDeg` is clockwise from the top.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: r3(cx + radius * Math.cos(rad)), y: r3(cy + radius * Math.sin(rad)) }
}

/**
 * SVG path for a single stroked arc (no fill) sweeping clockwise from
 * `startAngle` to `endAngle` along one radius. Used for gauge track + value arcs.
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * SVG path for a filled slice sweeping clockwise from `startAngle` to
 * `endAngle`. When `innerRadius` is 0 it is a pie wedge (anchored at the center);
 * when `innerRadius > 0` it is an annular (donut) ring segment.
 */
export function describeSlice(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle)

  if (innerRadius <= 0) {
    return [
      `M ${r3(cx)} ${r3(cy)}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ')
  }

  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}
