import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { Checkbox } from '../Checkbox/Checkbox'
import {
  isAllSelected,
  isInteractiveTarget,
  selectAllState,
  sortRows,
  toggleSelection,
  type SelectAllState,
  type SortDirection,
} from './logic'

export type RowId = string | number

export interface Column<T> {
  /** Key into the row used for default rendering and sorting. */
  key: keyof T & string
  /** Column header content. */
  header: ReactNode
  /** React key / identity of the column when two columns share the same `key`. */
  id?: string
  /** When true, the header becomes a sort toggle. */
  sortable?: boolean
  /** Horizontal alignment of cells and header. Default `'left'`. */
  align?: 'left' | 'right' | 'center'
  /** Custom cell renderer. Falls back to `String(row[key])`. Inputs rendered
   *  here (inline editing) never trigger `onRowClick`. */
  render?: (row: T) => ReactNode
  /** Extra classes on this column's header and cells (width, nowrap…). */
  className?: string
}

export interface TableProps<T extends { id: RowId }> {
  columns: Column<T>[]
  data: T[]
  /** Adds a leading checkbox column with select-all. */
  selectable?: boolean
  /** Controlled selection (ids). When omitted, selection is uncontrolled. */
  selectedIds?: RowId[]
  onSelectionChange?: (ids: RowId[]) => void
  /** Delegates the header checkbox to the consumer (e.g. "select all 2 000
   *  matches" on the server, or a selection cap). When set, the header checkbox
   *  calls this instead of selecting the visible rows itself. */
  onSelectAll?: (select: boolean) => void
  /** Overrides what the header checkbox shows. Default: derived from the
   *  selectable (non-disabled) rows. */
  selectAllState?: SelectAllState
  /** Hides the header checkbox (rows stay selectable). */
  hideSelectAll?: boolean
  /** Makes the whole row clickable (and focusable: Enter / Space activate it).
   *  Clicks on buttons, links and inputs inside the row are ignored. */
  onRowClick?: (row: T) => void
  /** Disabled rows are dimmed and can be neither clicked nor selected. */
  isRowDisabled?: (row: T) => boolean
  /** Fires with the row under the pointer (or focused), and `null` when it leaves the body. */
  onRowHover?: (row: T | null) => void
  /** Row drawn as highlighted — pair with `onRowHover` to share hover with a chart. */
  highlightedKey?: RowId | null
  /** Replaces a row's cells, e.g. an inline editor. Return the `<td>` cells
   *  (use `colSpan` for a full-width one) or `null`/`undefined` to render the
   *  row normally. The checkbox cell is not rendered for a replaced row. */
  renderRow?: (row: T, ctx: { colSpan: number }) => ReactNode
  /** Rows (`<tr>`) rendered in the body before the data rows — summaries, totals. */
  prependRows?: ReactNode
  /** Rows (`<tr>`) rendered in the body after the data rows — an "add new" editor row. */
  appendRows?: ReactNode
  /** Shown as one full-width row when `data` is empty. */
  empty?: ReactNode
  /** Pins the first data column (and the checkbox column) while scrolling sideways. */
  stickyFirstColumn?: boolean
  /** Pins the header row while the wrapper scrolls vertically (give it a max height). */
  stickyHeader?: boolean
  /** Row height / padding. Default `'comfortable'`. */
  density?: 'comfortable' | 'compact'
  className?: string
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function Table<T extends { id: RowId }>({
  columns,
  data,
  selectable = false,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  selectAllState: selectAllOverride,
  hideSelectAll = false,
  onRowClick,
  isRowDisabled,
  onRowHover,
  highlightedKey,
  renderRow,
  prependRows,
  appendRows,
  empty,
  stickyFirstColumn = false,
  stickyHeader = false,
  density = 'comfortable',
  className,
}: TableProps<T>) {
  const [sort, setSort] = useState<{ key: keyof T & string; direction: SortDirection } | null>(null)

  // Uncontrolled selection fallback.
  const [internalSelected, setInternalSelected] = useState<Set<RowId>>(new Set())
  const isControlled = selectedIds !== undefined
  const selected = useMemo(
    () => (isControlled ? new Set<RowId>(selectedIds) : internalSelected),
    [isControlled, selectedIds, internalSelected],
  )

  const rows = useMemo(
    () => (sort ? sortRows(data, sort.key, sort.direction) : data),
    [data, sort],
  )

  // Disabled rows are left out of select-all.
  const allIds = useMemo(
    () => data.filter((r) => !isRowDisabled?.(r)).map((r) => r.id),
    [data, isRowDisabled],
  )
  const headState = selectAllOverride ?? selectAllState(selected, allIds)
  const allSelected = headState === 'all'
  const someSelected = headState === 'some'

  function commit(next: Set<RowId>) {
    if (!isControlled) setInternalSelected(next)
    onSelectionChange?.([...next])
  }

  function toggleRow(id: RowId) {
    commit(toggleSelection(selected, id))
  }

  function toggleAll() {
    if (onSelectAll) {
      onSelectAll(!allSelected)
      return
    }
    // Ids outside the selectable rows (e.g. disabled ones) keep their state.
    const others = [...selected].filter((id) => !allIds.includes(id))
    commit(new Set<RowId>(isAllSelected(selected, allIds) ? others : [...allIds, ...others]))
  }

  function toggleSort(key: keyof T & string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3'
  const colSpan = columns.length + (selectable ? 1 : 0)
  // The checkbox column has a fixed width so the sticky first column knows its offset.
  const checkCol = cn(stickyFirstColumn ? 'w-12 min-w-12 px-0 text-center' : 'w-px', !stickyFirstColumn && cellPad)
  const stickyCell = (index: number, head: boolean) =>
    stickyFirstColumn && index === 0
      ? cn(
          'sticky z-[1]',
          selectable ? 'left-12' : 'left-0',
          head ? 'bg-surface-sunken' : 'bg-inherit',
          'shadow-[1px_0_0_var(--color-border)]',
        )
      : undefined
  const stickyCheck = stickyFirstColumn ? 'sticky left-0 z-[1]' : undefined

  function onRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onRowClick?.(row)
    }
  }

  function onRowClickCapture(e: MouseEvent<HTMLTableRowElement>, row: T) {
    if (isInteractiveTarget(e.target as Element, e.currentTarget)) return
    onRowClick?.(row)
  }

  return (
    <div
      className={cn('overflow-auto rounded-card border border-border', className)}
      {...tcl('Table', { selectable, density, stickyFirstColumn, stickyHeader, clickable: !!onRowClick })}
    >
      <table className="w-full border-collapse text-sm">
        <thead className={cn(stickyHeader && 'sticky top-0 z-[2]')}>
          <tr className="border-b border-border bg-surface-sunken">
            {selectable && (
              <th scope="col" className={cn(checkCol, stickyCheck, stickyFirstColumn && 'bg-surface-sunken')}>
                {hideSelectAll ? (
                  <span className="sr-only">Select</span>
                ) : (
                  <Checkbox
                    aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                    checked={allSelected}
                    indeterminate={someSelected}
                    disabled={!onSelectAll && allIds.length === 0}
                    onChange={toggleAll}
                  />
                )}
              </th>
            )}
            {columns.map((col, ci) => {
              const isSorted = sort?.key === col.key
              const ariaSort = isSorted
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : col.sortable
                  ? 'none'
                  : undefined
              return (
                <th
                  key={col.id ?? col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'font-semibold text-text',
                    cellPad,
                    alignClass[col.align ?? 'left'],
                    stickyCell(ci, true),
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-sm font-semibold text-text',
                        'transition-colors hover:text-accent',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                        col.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sort.direction === 'asc' ? (
                          <ChevronUp className="size-3.5 text-accent" aria-hidden />
                        ) : (
                          <ChevronDown className="size-3.5 text-accent" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-text-subtle" aria-hidden />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody onMouseLeave={onRowHover ? () => onRowHover(null) : undefined}>
          {prependRows}
          {rows.length === 0 && empty != null && (
            <tr>
              <td colSpan={colSpan} className={cn('text-text-muted', cellPad)}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const isRowSelected = selected.has(row.id)
            const disabled = isRowDisabled?.(row) ?? false
            const highlighted = highlightedKey != null && highlightedKey === row.id
            const clickable = !!onRowClick && !disabled
            const custom = renderRow?.(row, { colSpan })
            return (
              <tr
                key={row.id}
                aria-disabled={disabled || undefined}
                data-highlighted={highlighted || undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? (e) => onRowClickCapture(e, row) : undefined}
                onKeyDown={clickable ? (e) => onRowKeyDown(e, row) : undefined}
                onMouseEnter={onRowHover ? () => onRowHover(row) : undefined}
                onFocus={onRowHover ? () => onRowHover(row) : undefined}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  'odd:bg-surface-raised even:bg-surface',
                  !disabled && 'hover:bg-surface-sunken',
                  highlighted && 'bg-surface-sunken odd:bg-surface-sunken even:bg-surface-sunken',
                  isRowSelected && 'bg-accent-subtle odd:bg-accent-subtle even:bg-accent-subtle hover:bg-accent-subtle',
                  clickable &&
                    'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
                  disabled && 'cursor-not-allowed text-text-muted',
                )}
              >
                {custom != null ? (
                  custom
                ) : (
                  <>
                    {selectable && (
                      <td className={cn(checkCol, stickyCheck, stickyFirstColumn && 'bg-inherit')}>
                        <Checkbox
                          aria-label={`Select row ${row.id}`}
                          checked={isRowSelected}
                          disabled={disabled}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                    )}
                    {columns.map((col, ci) => (
                      <td
                        key={col.id ?? col.key}
                        className={cn(
                          disabled ? 'text-text-muted' : 'text-text',
                          cellPad,
                          alignClass[col.align ?? 'left'],
                          stickyCell(ci, false),
                          col.className,
                        )}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </>
                )}
              </tr>
            )
          })}
          {appendRows}
        </tbody>
      </table>
    </div>
  )
}
