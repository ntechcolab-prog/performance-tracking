export type SortDirection = 'asc' | 'desc'

/**
 * Returns a new array of `rows` sorted by `key` in the given `direction`.
 *
 * Stable: rows comparing equal keep their original relative order. Numbers are
 * compared numerically; everything else is compared as a case-insensitive
 * string via `localeCompare`. The input array is never mutated.
 *
 * Re-implemented module-locally (it mirrors `Table/logic.ts`) so the DataGrid
 * stays self-contained for copy-paste; it is intentionally not re-exported from
 * the package barrel to avoid colliding with `Table`'s `sortRows`.
 */
export function sortRows<T>(rows: T[], key: keyof T, direction: SortDirection): T[] {
  const factor = direction === 'desc' ? -1 : 1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = a.row[key]
      const bv = b.row[key]
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      }
      return cmp !== 0 ? cmp * factor : a.index - b.index
    })
    .map((entry) => entry.row)
}

/**
 * Returns a new width map with `key` resized by `delta`, clamped to `min`.
 * Unknown keys are returned unchanged. Never mutates the input.
 */
export function applyColumnResize(
  widths: Record<string, number>,
  key: string,
  delta: number,
  min: number,
): Record<string, number> {
  if (!(key in widths)) return { ...widths }
  return { ...widths, [key]: Math.max(min, widths[key] + delta) }
}

/**
 * Returns a new array with the item at `from` moved to `to`. Indices are
 * clamped into range. Never mutates the input.
 */
export function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const clampedFrom = Math.max(0, Math.min(from, next.length - 1))
  const clampedTo = Math.max(0, Math.min(to, next.length - 1))
  const [item] = next.splice(clampedFrom, 1)
  next.splice(clampedTo, 0, item)
  return next
}

export interface VisibleRange {
  start: number
  end: number
}

/**
 * Computes the inclusive-exclusive `[start, end)` row index window to render for
 * a virtualized list, padding by `overscan` rows on each side and clamping to
 * `[0, total]`.
 */
export function getVisibleRange(
  scrollTop: number,
  rowHeight: number,
  viewportH: number,
  total: number,
  overscan: number,
): VisibleRange {
  if (total <= 0 || rowHeight <= 0) return { start: 0, end: 0 }
  const firstVisible = Math.floor(scrollTop / rowHeight)
  const visibleCount = Math.ceil(viewportH / rowHeight)
  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(total, firstVisible + visibleCount + overscan)
  return { start, end }
}
