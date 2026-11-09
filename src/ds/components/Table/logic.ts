export type SortDirection = 'asc' | 'desc'

/**
 * Returns a new array of `rows` sorted by `key` in the given `direction`.
 *
 * Stable: rows comparing equal keep their original relative order. Numbers are
 * compared numerically; everything else is compared as a case-insensitive
 * string via `localeCompare`. The input array is never mutated.
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
      // Tie-break on original index to keep the sort stable.
      return cmp !== 0 ? cmp * factor : a.index - b.index
    })
    .map((entry) => entry.row)
}

/** Returns a new Set with `id` toggled (added if absent, removed if present). */
export function toggleSelection<T>(selected: Set<T>, id: T): Set<T> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** True when `ids` is non-empty and every id is present in `selected`. */
export function isAllSelected<T>(selected: Set<T>, ids: T[]): boolean {
  return ids.length > 0 && ids.every((id) => selected.has(id))
}
