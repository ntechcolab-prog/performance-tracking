export type PageItem = number | 'ellipsis'

function range(start: number, end: number): number[] {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

/**
 * Builds a compact list of page tokens for a pager.
 *
 * Returns page numbers interleaved with `'ellipsis'` markers, always keeping
 * the first page, the last page, and `siblingCount` pages either side of the
 * current `page`. When the total number of pages is small enough to show
 * everything (`pageCount <= 5 + siblingCount * 2`) every page is listed.
 *
 * @example getPageRange(5, 10) // [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
 */
export function getPageRange(page: number, pageCount: number, siblingCount = 1): PageItem[] {
  if (pageCount <= 0) return []

  // first + last + current + 2 ellipsis slots + sibling pages on each side
  const totalNumbers = 5 + siblingCount * 2
  if (pageCount <= totalNumbers) return range(1, pageCount)

  const left = Math.max(page - siblingCount, 1)
  const right = Math.min(page + siblingCount, pageCount)

  const pages = new Set<number>([1, pageCount])
  for (let p = left; p <= right; p++) pages.add(p)

  const sorted = [...pages].sort((a, b) => a - b)
  const result: PageItem[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis')
    result.push(p)
    prev = p
  }
  return result
}
