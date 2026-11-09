import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { Checkbox } from '../Checkbox/Checkbox'
import { isAllSelected, sortRows, toggleSelection, type SortDirection } from './logic'

export type RowId = string | number

export interface Column<T> {
  /** Key into the row used for default rendering and sorting. */
  key: keyof T & string
  /** Column header label. */
  header: string
  /** When true, the header becomes a sort toggle. */
  sortable?: boolean
  /** Horizontal alignment of cells and header. Default `'left'`. */
  align?: 'left' | 'right' | 'center'
  /** Custom cell renderer. Falls back to `String(row[key])`. */
  render?: (row: T) => ReactNode
}

export interface TableProps<T extends { id: RowId }> {
  columns: Column<T>[]
  data: T[]
  /** Adds a leading checkbox column with select-all. */
  selectable?: boolean
  /** Controlled selection (ids). When omitted, selection is uncontrolled. */
  selectedIds?: RowId[]
  onSelectionChange?: (ids: RowId[]) => void
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

  const allIds = useMemo(() => data.map((r) => r.id), [data])
  const allSelected = isAllSelected(selected, allIds)
  const someSelected = selected.size > 0 && !allSelected

  function commit(next: Set<RowId>) {
    if (!isControlled) setInternalSelected(next)
    onSelectionChange?.([...next])
  }

  function toggleRow(id: RowId) {
    commit(toggleSelection(selected, id))
  }

  function toggleAll() {
    commit(allSelected ? new Set<RowId>() : new Set<RowId>(allIds))
  }

  function toggleSort(key: keyof T & string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3'

  return (
    <div
      className={cn('overflow-x-auto rounded-card border border-border', className)}
      {...tcl('Table', { selectable, density })}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-sunken">
            {selectable && (
              <th scope="col" className={cn('w-px', cellPad)}>
                <Checkbox
                  aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => {
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
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'font-semibold text-text',
                    cellPad,
                    alignClass[col.align ?? 'left'],
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
        <tbody>
          {rows.map((row) => {
            const isRowSelected = selected.has(row.id)
            return (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  'odd:bg-surface-raised even:bg-surface',
                  'hover:bg-surface-sunken',
                  isRowSelected && 'bg-accent-subtle hover:bg-accent-subtle',
                )}
              >
                {selectable && (
                  <td className={cn('w-px', cellPad)}>
                    <Checkbox
                      aria-label={`Select row ${row.id}`}
                      checked={isRowSelected}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('text-text', cellPad, alignClass[col.align ?? 'left'])}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
