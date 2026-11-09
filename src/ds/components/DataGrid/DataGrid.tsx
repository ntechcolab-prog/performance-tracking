import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp, GripVertical } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { Checkbox } from '../Checkbox/Checkbox'
import {
  applyColumnResize,
  getVisibleRange,
  sortRows,
  type SortDirection,
} from './logic'

export type RowId = string | number

export interface DataGridColumn<T> {
  /** Key into the row used for default rendering and sorting. */
  key: keyof T & string
  header: string
  /** Initial width in px. Default `160`. */
  width?: number
  /** Minimum width when resizing. Default `80`. */
  minWidth?: number
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  /** Pin the column to the left edge during horizontal scroll. */
  pinned?: 'left'
  render?: (row: T) => ReactNode
}

export interface DataGridProps<T extends { id: RowId }> {
  columns: DataGridColumn<T>[]
  rows: T[]
  /** Row height in px, used for virtualization math. Default `44`. */
  rowHeight?: number
  /** Viewport height in px. Vertical virtualization kicks in when rows overflow. Default `480`. */
  height?: number
  selectable?: boolean
  selectedIds?: RowId[]
  onSelectionChange?: (ids: RowId[]) => void
  /** Sticky header row. Default `true`. */
  stickyHeader?: boolean
  onSortChange?: (sort: { key: keyof T & string; direction: SortDirection } | null) => void
  className?: string
}

const SELECTION_WIDTH = 44
const RESIZE_STEP = 16
const OVERSCAN = 6

const alignClass = {
  left: 'justify-start text-left',
  right: 'justify-end text-right',
  center: 'justify-center text-center',
} as const

export function DataGrid<T extends { id: RowId }>({
  columns,
  rows,
  rowHeight = 44,
  height = 480,
  selectable = false,
  selectedIds,
  onSelectionChange,
  stickyHeader = true,
  onSortChange,
  className,
}: DataGridProps<T>) {
  const labelId = useId()

  // Column order: pinned-left columns first, preserving their relative order.
  const orderedColumns = useMemo(() => {
    const pinned = columns.filter((c) => c.pinned === 'left')
    const rest = columns.filter((c) => c.pinned !== 'left')
    return [...pinned, ...rest]
  }, [columns])

  // Resizable widths keyed by column key.
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.width ?? 160])),
  )
  const widthOf = (key: string) => widths[key] ?? 160
  const minOf = (key: string) => columns.find((c) => c.key === key)?.minWidth ?? 80

  // Sorting.
  const [sort, setSort] = useState<{ key: keyof T & string; direction: SortDirection } | null>(
    null,
  )
  const sortedRows = useMemo(
    () => (sort ? sortRows(rows, sort.key, sort.direction) : rows),
    [rows, sort],
  )

  function toggleSort(key: keyof T & string) {
    setSort((prev) => {
      let next: typeof prev
      if (prev?.key !== key) next = { key, direction: 'asc' }
      else if (prev.direction === 'asc') next = { key, direction: 'desc' }
      else next = null
      onSortChange?.(next)
      return next
    })
  }

  // Selection (controlled or uncontrolled).
  const [internalSelected, setInternalSelected] = useState<Set<RowId>>(new Set())
  const isControlled = selectedIds !== undefined
  const selected = useMemo(
    () => (isControlled ? new Set<RowId>(selectedIds) : internalSelected),
    [isControlled, selectedIds, internalSelected],
  )
  const allIds = useMemo(() => rows.map((r) => r.id), [rows])
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected

  function commit(next: Set<RowId>) {
    if (!isControlled) setInternalSelected(next)
    onSelectionChange?.([...next])
  }
  function toggleRow(id: RowId) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    commit(next)
  }
  function toggleAll() {
    commit(allSelected ? new Set<RowId>() : new Set<RowId>(allIds))
  }

  // Virtualization.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const headerH = rowHeight
  const viewportBody = height - headerH
  const { start, end } = getVisibleRange(scrollTop, rowHeight, viewportBody, sortedRows.length, OVERSCAN)
  const visible = sortedRows.slice(start, end)

  // Sticky-left offsets per pinned column (cumulative).
  const pinnedOffsets = useMemo(() => {
    const offsets: Record<string, number> = {}
    let acc = selectable ? SELECTION_WIDTH : 0
    for (const col of orderedColumns) {
      if (col.pinned === 'left') {
        offsets[col.key] = acc
        acc += widthOf(col.key)
      }
    }
    return offsets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedColumns, widths, selectable])

  const totalWidth =
    (selectable ? SELECTION_WIDTH : 0) +
    orderedColumns.reduce((sum, c) => sum + widthOf(c.key), 0)

  // Pointer-drag resize.
  const dragState = useRef<{ key: string; startX: number; startW: number } | null>(null)
  function startResize(key: string, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragState.current = { key, startX: e.clientX, startW: widthOf(key) }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onResizeMove(e: React.PointerEvent) {
    const d = dragState.current
    if (!d) return
    setWidths((w) => ({ ...w, [d.key]: Math.max(minOf(d.key), d.startW + (e.clientX - d.startX)) }))
  }
  function endResize(e: React.PointerEvent) {
    if (!dragState.current) return
    dragState.current = null
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }
  function onResizeKey(key: string, e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setWidths((w) => applyColumnResize(w, key, RESIZE_STEP, minOf(key)))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setWidths((w) => applyColumnResize(w, key, -RESIZE_STEP, minOf(key)))
    }
  }

  function cellStyle(col: DataGridColumn<T>): CSSProperties {
    const base: CSSProperties = { width: widthOf(col.key), flex: `0 0 ${widthOf(col.key)}px` }
    if (col.pinned === 'left') {
      return { ...base, position: 'sticky', left: pinnedOffsets[col.key], zIndex: 1 }
    }
    return base
  }

  return (
    <div
      className={cn('overflow-hidden rounded-card border border-border bg-surface-raised', className)}
      {...tcl('DataGrid', { rowHeight, height, selectable, stickyHeader })}
    >
      <span id={labelId} className="sr-only">
        Data grid with {sortedRows.length} rows
      </span>
      <div
        ref={scrollRef}
        role="grid"
        aria-labelledby={labelId}
        aria-rowcount={sortedRows.length + 1}
        aria-colcount={orderedColumns.length + (selectable ? 1 : 0)}
        tabIndex={0}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={{ height, overflow: 'auto' }}
        className="relative text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        {/* Header */}
        <div
          role="row"
          aria-rowindex={1}
          style={{ width: totalWidth, height: headerH }}
          className={cn(
            'flex border-b border-border bg-surface-sunken',
            stickyHeader && 'sticky top-0 z-20',
          )}
        >
          {selectable && (
            <div
              role="columnheader"
              aria-colindex={1}
              style={{ width: SELECTION_WIDTH, flex: `0 0 ${SELECTION_WIDTH}px`, position: 'sticky', left: 0, zIndex: 2 }}
              className="flex items-center justify-center bg-surface-sunken"
            >
              <Checkbox
                aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
              />
            </div>
          )}
          {orderedColumns.map((col, i) => {
            const isSorted = sort?.key === col.key
            const ariaSort = isSorted
              ? sort.direction === 'asc'
                ? 'ascending'
                : 'descending'
              : col.sortable
                ? 'none'
                : undefined
            return (
              <div
                key={col.key}
                role="columnheader"
                aria-colindex={i + 1 + (selectable ? 1 : 0)}
                aria-sort={ariaSort}
                style={cellStyle(col)}
                className={cn(
                  'group relative flex items-center gap-1.5 px-3 font-semibold text-text',
                  col.pinned === 'left' && 'bg-surface-sunken',
                  alignClass[col.align ?? 'left'],
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      'inline-flex min-w-0 items-center gap-1.5 rounded-sm font-semibold text-text',
                      'transition-colors hover:text-accent',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                      col.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    <span className="truncate">{col.header}</span>
                    {isSorted ? (
                      sort.direction === 'asc' ? (
                        <ChevronUp className="size-3.5 shrink-0 text-accent" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3.5 shrink-0 text-accent" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 shrink-0 text-text-subtle" aria-hidden />
                    )}
                  </button>
                ) : (
                  <span className="truncate">{col.header}</span>
                )}
                {/* Resize handle */}
                <button
                  type="button"
                  aria-label={`Resize ${col.header} column`}
                  onPointerDown={(e) => startResize(col.key, e)}
                  onPointerMove={onResizeMove}
                  onPointerUp={endResize}
                  onKeyDown={(e) => onResizeKey(col.key, e)}
                  className={cn(
                    'absolute right-0 top-0 z-10 flex h-full w-3 cursor-col-resize items-center justify-center',
                    'text-transparent transition-colors hover:text-text-subtle group-hover:text-border-strong',
                    'focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset',
                  )}
                >
                  <GripVertical className="size-3" aria-hidden />
                </button>
              </div>
            )
          })}
        </div>

        {/* Body: spacer establishes full scroll height; rows are absolutely positioned. */}
        <div style={{ position: 'relative', height: sortedRows.length * rowHeight, width: totalWidth }}>
          {visible.map((row, vi) => {
            const rowIndex = start + vi
            const isRowSelected = selected.has(row.id)
            return (
              <div
                key={row.id}
                role="row"
                aria-rowindex={rowIndex + 2}
                aria-selected={selectable ? isRowSelected : undefined}
                style={{ position: 'absolute', top: rowIndex * rowHeight, height: rowHeight, width: totalWidth }}
                className={cn(
                  'flex border-b border-border transition-colors',
                  rowIndex % 2 === 1 ? 'bg-surface' : 'bg-surface-raised',
                  'hover:bg-surface-sunken',
                  isRowSelected && 'bg-accent-subtle hover:bg-accent-subtle',
                )}
              >
                {selectable && (
                  <div
                    role="gridcell"
                    aria-colindex={1}
                    style={{ width: SELECTION_WIDTH, flex: `0 0 ${SELECTION_WIDTH}px`, position: 'sticky', left: 0, zIndex: 1 }}
                    className={cn(
                      'flex items-center justify-center',
                      isRowSelected ? 'bg-accent-subtle' : rowIndex % 2 === 1 ? 'bg-surface' : 'bg-surface-raised',
                    )}
                  >
                    <Checkbox
                      aria-label={`Select row ${row.id}`}
                      checked={isRowSelected}
                      onChange={() => toggleRow(row.id)}
                    />
                  </div>
                )}
                {orderedColumns.map((col, i) => (
                  <div
                    key={col.key}
                    role="gridcell"
                    aria-colindex={i + 1 + (selectable ? 1 : 0)}
                    style={cellStyle(col)}
                    className={cn(
                      'flex items-center truncate px-3 text-text',
                      col.pinned === 'left' &&
                        (isRowSelected
                          ? 'bg-accent-subtle'
                          : rowIndex % 2 === 1
                            ? 'bg-surface'
                            : 'bg-surface-raised'),
                      alignClass[col.align ?? 'left'],
                    )}
                  >
                    <span className="truncate">
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
