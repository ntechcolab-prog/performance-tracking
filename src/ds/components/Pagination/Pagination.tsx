import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { IconButton } from '../IconButton/IconButton'
import { getPageRange } from './logic'

export interface PaginationProps {
  /** Current page (1-based). */
  page: number
  /** Total number of pages. */
  pageCount: number
  onPageChange: (page: number) => void
  /** Pages to show either side of the current page. Default 1. */
  siblingCount?: number
  className?: string
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null

  const items = getPageRange(page, pageCount, siblingCount)
  const go = (p: number) => p !== page && onPageChange(p)

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center gap-1', className)}
      {...tcl('Pagination', { page, pageCount, siblingCount })}
    >
      <IconButton
        size="sm"
        variant="ghost"
        aria-label="Previous page"
        icon={<ChevronLeft className="size-4" />}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      />

      <ul className="flex items-center gap-1">
        {items.map((item, i) =>
          item === 'ellipsis' ? (
            <li
              key={`ellipsis-${i}`}
              aria-hidden
              className="flex size-8 items-center justify-center text-text-subtle"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => go(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  'inline-flex size-8 items-center justify-center rounded-card text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                  item === page
                    ? 'bg-accent text-on-accent'
                    : 'text-text hover:bg-surface-sunken',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <IconButton
        size="sm"
        variant="ghost"
        aria-label="Next page"
        icon={<ChevronRight className="size-4" />}
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
      />
    </nav>
  )
}
