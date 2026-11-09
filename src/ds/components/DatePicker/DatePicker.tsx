import { useEffect, useId, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { Popover } from '../Popover'
import { IconButton } from '../IconButton'
import {
  addMonths,
  clampDate,
  formatISO,
  getMonthMatrix,
  isDayDisabled,
  isSameDay,
  startOfDay,
  type WeekStart,
} from './logic'

export interface DatePickerProps {
  /** Currently selected date (controlled). */
  value?: Date | null
  onChange?: (date: Date | null) => void
  /** Earliest selectable date (inclusive). */
  min?: Date
  /** Latest selectable date (inclusive). */
  max?: Date
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  /** First day of the week: 0 = Sunday, 1 = Monday. Default `1`. */
  weekStartsOn?: WeekStart
  /** Override how the selected date is rendered in the trigger. */
  format?: (d: Date) => string
  className?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const longFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})
const defaultFormat = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d)

export function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  hint,
  error,
  placeholder = 'Select a date',
  disabled,
  weekStartsOn = 1,
  format = defaultFormat,
  className,
}: DatePickerProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`
  const gridId = `${baseId}-grid`

  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const initial = clampDate(value ?? new Date(), min, max)
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [focusDate, setFocusDate] = useState<Date>(startOfDay(initial))

  // When opening, snap the view + roving focus to the selected day (or today).
  useEffect(() => {
    if (!open) return
    const anchor = startOfDay(clampDate(value ?? new Date(), min, max))
    setFocusDate(anchor)
    setView({ year: anchor.getFullYear(), month: anchor.getMonth() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function returnFocusToTrigger() {
    rootRef.current?.querySelector<HTMLButtonElement>('[data-dp-trigger]')?.focus()
  }

  function select(date: Date) {
    if (isDayDisabled(date, min, max)) return
    onChange?.(date)
    setOpen(false)
    returnFocusToTrigger()
  }

  const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined

  const trigger = (
    <button
      type="button"
      data-dp-trigger
      disabled={disabled}
      aria-haspopup="dialog"
      aria-labelledby={label ? `${labelId} ${baseId}-trigger` : undefined}
      id={`${baseId}-trigger`}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(
        'inline-flex h-10 w-full items-center justify-between gap-2 rounded-card border bg-surface-raised px-3 text-left text-sm text-text',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        error ? 'border-danger' : 'border-border',
      )}
    >
      <span className={cn(!value && 'text-text-muted')}>{value ? format(value) : placeholder}</span>
      <CalendarIcon className="size-4 shrink-0 text-text-subtle" aria-hidden />
    </button>
  )

  return (
    <div
      className="flex flex-col gap-1.5"
      {...tcl('DatePicker', { label, placeholder, disabled, error, weekStartsOn })}
    >
      {label && (
        <span id={labelId} className="text-sm font-medium text-text">
          {label}
        </span>
      )}
      <div ref={rootRef} className={cn('relative', className)}>
        <Popover trigger={trigger} open={open} onOpenChange={setOpen} side="bottom" align="start" className="p-0" aria-label="Choose a date">
          <CalendarPanel
            gridId={gridId}
            view={view}
            setView={setView}
            focusDate={focusDate}
            setFocusDate={setFocusDate}
            selected={value ?? null}
            min={min}
            max={max}
            weekStartsOn={weekStartsOn}
            onSelect={select}
            onClose={() => {
              setOpen(false)
              returnFocusToTrigger()
            }}
          />
        </Popover>
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface CalendarPanelProps {
  gridId: string
  view: { year: number; month: number }
  setView: (v: { year: number; month: number }) => void
  focusDate: Date
  setFocusDate: (d: Date) => void
  selected: Date | null
  min?: Date
  max?: Date
  weekStartsOn: WeekStart
  onSelect: (d: Date) => void
  onClose: () => void
}

/** Single-month calendar grid with full keyboard support (used by DatePicker). */
function CalendarPanel({
  gridId,
  view,
  setView,
  focusDate,
  setFocusDate,
  selected,
  min,
  max,
  weekStartsOn,
  onSelect,
  onClose,
}: CalendarPanelProps) {
  const labelId = `${gridId}-caption`
  const gridRef = useRef<HTMLDivElement>(null)
  const today = startOfDay(new Date())
  const weeks = getMonthMatrix(view.year, view.month, weekStartsOn)
  const weekdayOrder = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]

  // Keep DOM focus on the active day (roving tabindex). rAF so it lands after
  // the Popover finishes focusing its panel on open.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${formatISO(focusDate)}"]`)
        ?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [focusDate])

  function moveFocus(next: Date) {
    setFocusDate(next)
    if (next.getMonth() !== view.month || next.getFullYear() !== view.year) {
      setView({ year: next.getFullYear(), month: next.getMonth() })
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const d = focusDate
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault(); moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); break
      case 'ArrowRight':
        e.preventDefault(); moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)); break
      case 'ArrowUp':
        e.preventDefault(); moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)); break
      case 'ArrowDown':
        e.preventDefault(); moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)); break
      case 'Home':
        e.preventDefault(); {
          const off = (d.getDay() - weekStartsOn + 7) % 7
          moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() - off))
        }
        break
      case 'End':
        e.preventDefault(); {
          const off = (d.getDay() - weekStartsOn + 7) % 7
          moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - off)))
        }
        break
      case 'PageUp':
        e.preventDefault(); moveFocus(addMonths(d, -1)); break
      case 'PageDown':
        e.preventDefault(); moveFocus(addMonths(d, 1)); break
      case 'Enter':
      case ' ':
        e.preventDefault(); onSelect(focusDate); break
      case 'Escape':
        e.preventDefault(); onClose(); break
    }
  }

  function changeMonth(delta: number) {
    const next = addMonths(new Date(view.year, view.month, 1), delta)
    setView({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <div className="w-64 p-3">
      <div className="mb-2 flex items-center justify-between">
        <IconButton
          icon={<ChevronLeft className="size-4" />}
          aria-label="Previous month"
          variant="ghost"
          size="sm"
          onClick={() => changeMonth(-1)}
        />
        <span id={labelId} aria-live="polite" className="text-sm font-medium text-text">
          {MONTH_NAMES[view.month]} {view.year}
        </span>
        <IconButton
          icon={<ChevronRight className="size-4" />}
          aria-label="Next month"
          variant="ghost"
          size="sm"
          onClick={() => changeMonth(1)}
        />
      </div>

      <div role="grid" id={gridId} aria-labelledby={labelId} ref={gridRef} onKeyDown={onKeyDown}>
        <div role="row" className="mb-1 grid grid-cols-7">
          {weekdayOrder.map((wd) => (
            <span
              key={wd}
              role="columnheader"
              aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wd]}
              className="flex h-8 items-center justify-center text-xs font-medium text-text-muted"
            >
              {WEEKDAYS[wd]}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div role="row" key={wi} className="grid grid-cols-7">
            {week.map((cell) => {
              const iso = formatISO(cell.date)
              const isSelected = isSameDay(cell.date, selected)
              const isFocus = isSameDay(cell.date, focusDate)
              const isToday = isSameDay(cell.date, today)
              const disabled = isDayDisabled(cell.date, min, max)
              return (
                <div role="gridcell" aria-selected={isSelected} key={iso} className="flex items-center justify-center p-0.5">
                  <button
                    type="button"
                    data-day={iso}
                    tabIndex={isFocus ? 0 : -1}
                    disabled={disabled}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={longFmt.format(cell.date)}
                    onClick={() => onSelect(cell.date)}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-card text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      !cell.inCurrentMonth && 'text-text-muted',
                      cell.inCurrentMonth && !isSelected && 'text-text',
                      isToday && !isSelected && 'ring-1 ring-inset ring-border-strong',
                      isSelected && 'bg-accent text-on-accent font-medium',
                      !isSelected && !disabled && 'hover:bg-surface-sunken',
                      'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                  >
                    {cell.date.getDate()}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
