/**
 * Pure scale + tick helpers for the chart primitives. No React, no DOM — kept
 * dependency-free so they are trivially unit-testable and reusable.
 */

export interface LinearScaleOptions {
  /** Smallest value in the data domain. */
  domainMin: number
  /** Largest value in the data domain. */
  domainMax: number
  /** Pixel position that `domainMin` maps to. */
  rangeMin: number
  /** Pixel position that `domainMax` maps to (may be smaller than `rangeMin`). */
  rangeMax: number
}

/**
 * Builds a linear scale: a function mapping a domain value to a range pixel.
 *
 * Supports an inverted range (`rangeMin > rangeMax`) so it can drive an SVG
 * y-axis, where larger values sit higher on screen (smaller pixel y). A
 * zero-width domain collapses to `rangeMin` instead of dividing by zero.
 */
export function createLinearScale({
  domainMin,
  domainMax,
  rangeMin,
  rangeMax,
}: LinearScaleOptions): (value: number) => number {
  const domainSpan = domainMax - domainMin
  if (domainSpan === 0) return () => rangeMin
  const rangeSpan = rangeMax - rangeMin
  return (value: number) => rangeMin + ((value - domainMin) / domainSpan) * rangeSpan
}

/** Rounds a span to a "nice" number (1, 2, 5 × 10ⁿ). */
function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }
  return niceFraction * 10 ** exponent
}

/**
 * Returns rounded ("nice") tick values spanning `[min, max]`, aiming for about
 * `count` intervals. The bounds are expanded outward to the nearest nice step,
 * so the first and last ticks fully enclose the data. When `min === max` a
 * single tick is returned.
 *
 * @example niceTicks(0, 95, 5) // [0, 20, 40, 60, 80, 100]
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min]
  const range = niceNum(max - min, false)
  const step = niceNum(range / Math.max(1, count - 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  // Guard against float drift accumulating across the loop.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Number(v.toFixed(decimals)))
  }
  return ticks
}
