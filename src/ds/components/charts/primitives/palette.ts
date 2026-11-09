/**
 * Categorical color palette for multi-slice / multi-series charts (donut, pie,
 * scatter). Drawn from the NETZSCH brand + status primitives and ordered so
 * adjacent entries stay visually distinct. The first entry is the brand accent
 * so single-emphasis charts lead with it.
 *
 * Every entry references a primitive CSS variable. The accent is the deep brand
 * green (#007167), so the sixth slot uses a mid green (green-60) to stay
 * distinct from it.
 */
export const CHART_PALETTE = [
  'var(--color-accent)', // teal   #007167
  'var(--color-tecblue-100)', // blue   #4e98aa
  'var(--color-violet-100)', // violet #51476d
  'var(--color-yellow-90)', // amber  #e7b547
  'var(--color-anthracite-80)', // gray   #6b6e73
  'var(--color-green-60)', // mid green #46aa9f
] as const

/** Picks a palette color by index, wrapping around for long datasets. */
export function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}
