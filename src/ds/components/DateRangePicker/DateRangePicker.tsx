import { useEffect, useId, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { Popover } from '../Popover'
import { IconButton } from '../IconButton'
import {
  addMonths,
  formatISO,
  getMonthMatrix,
  isDayDisabled,
  isSameDay,
  startOfDay,
  type WeekStart,
} from '../DatePicker/logic'

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface RangePreset {
  label: string
  range: () => { start: Date; end: Date }
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  min?: Date
  max?: Date
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  weekStartsOn?: WeekStart
  /** Months shown side by side (md+). Falls back to 1 on small screens. Default `2`. */
  numberOfMonths?: 1 | 2
  /** Quick-pick ranges shown as a side list. */
  presets?: RangePreset[]
  className?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const longFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})
const shortFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

function ordered(a: Date, b: Date): [Date, Date] {
  return a.getTime() <= b.getTime() ? [a, b] : [b, a]
}

export function DateRangePicker({
  value = { start: null, end: null },
  onChange,
  min,
  max,
  label,
  hint,
  error,
  placeholder = 'Select a date range',
  disabled,
  weekStartsOn = 1,
  numberOfMonths = 2,
  presets,
  className,
}: DateRangePickerProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`

  const rootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const anchor = startOfDay(value.start ?? new Date())
  const [leftView, setLeftView] = useState({ year: anchor.getFullYear(), month: anchor.getMonth() })
  const [focusDate, setFocusDate] = useState<Date>(anchor)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // selecting the end when a start is set but the end is not yet.
  const selecting = !!value.start && !value.end

  useEffect(() => {
    if (!open) return
    const a = startOfDay(value.start ?? new Date())
    setFocusDate(a)
    setLeftView({ year: a.getFullYear(), month: a.getMonth() })
    setHoverDate(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function returnFocusToTrigger() {
    rootRef.current?.querySelector<HTMLButtonElement>('[data-drp-trigger]')?.focus()
  }

  function pickDay(date: Date) {
    if (isDayDisabled(date, min, max)) return
    if (!value.start || (value.start && value.end)) {
      onChange?.({ start: date, end: null })
      setHoverDate(null)
    } else {
      const [lo, hi] = ordered(value.start, date)
      onChange?.({ start: lo, end: hi })
      setHoverDate(null)
      setOpen(false)
      returnFocusToTrigger()
    }
  }

  function applyPreset(preset: RangePreset) {
    const { start, end } = preset.range()
    onChange?.({ start: startOfDay(start), end: startOfDay(end) })
    setOpen(false)
    returnFocusToTrigger()
  }

  // Keep DOM focus on the active day across both month grids (roving tabindex).
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      containerRef.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${formatISO(focusDate)}"]`)
        ?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [focusDate, open])

  const monthsShown = numberOfMonths
  const lastView = addMonths(new Date(leftView.year, leftView.month, 1), monthsShown - 1)

  function ensureVisible(d: Date) {
    const t = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    const lo = new Date(leftView.year, leftView.month, 1).getTime()
    const hi = new Date(lastView.getFullYear(), lastView.getMonth(), 1).getTime()
    if (t < lo) setLeftView({ year: d.getFullYear(), month: d.getMonth() })
    else if (t > hi) {
      const nl = addMonths(new Date(d.getFullYear(), d.getMonth(), 1), -(monthsShown - 1))
      setLeftView({ year: nl.getFullYear(), month: nl.getMonth() })
    }
  }

  function moveFocus(next: Date) {
    setFocusDate(next)
    if (selecting) setHoverDate(next)
    ensureVisible(next)
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
        e.preventDefault(); pickDay(focusDate); break
      case 'Escape':
        e.preventDefault(); setOpen(false); returnFocusToTrigger(); break
    }
  }

  function shiftViews(delta: number) {
    const next = addMonths(new Date(leftView.year, leftView.month, 1), delta)
    setLeftView({ year: next.getFullYear(), month: next.getMonth() })
  }

  const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined

  const triggerText =
    value.start && value.end
      ? `${shortFmt.format(value.start)} – ${shortFmt.format(value.end)}`
      : value.start
        ? `${shortFmt.format(value.start)} – …`
        : placeholder

  const trigger = (
    <button
      type="button"
      data-drp-trigger
      disabled={disabled}
      aria-haspopup="dialog"
      id={`${baseId}-trigger`}
      aria-labelledby={label ? `${labelId} ${baseId}-trigger` : undefined}
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
      <span className={cn(!value.start && 'text-text-muted')}>{triggerText}</span>
      <CalendarIcon className="size-4 shrink-0 text-text-subtle" aria-hidden />
    </button>
  )

  // Build the [start, end-or-preview] window used to paint range highlights.
  const previewEnd = value.end ?? (selecting ? hoverDate : null)
  const window = value.start && previewEnd ? ordered(value.start, previewEnd) : null
  const today = startOfDay(new Date())

  function renderMonth(view: { year: number; month: number }, key: string) {
    const captionId = `${baseId}-cap-${key}`
    const weeks = getMonthMatrix(view.year, view.month, weekStartsOn)
    const weekdayOrder = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
    return (
      <div className="w-64">
        <div id={captionId} className="mb-2 flex h-8 items-center justify-center text-sm font-medium text-text">
          {MONTH_NAMES[view.month]} {view.year}
        </div>
        <div role="grid" aria-labelledby={captionId} onKeyDown={onKeyDown}>
          <div role="row" className="mb-1 grid grid-cols-7">
            {weekdayOrder.map((wd) => (
              <span
                key={wd}
                role="columnheader"
                aria-label={WEEKDAY_LABELS[wd]}
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
                const t = cell.date.getTime()
                const isStart = window && isSameDay(cell.date, window[0])
                const isEnd = window && isSameDay(cell.date, window[1])
                const isEndpoint =
                  isSameDay(cell.date, value.start) || isSameDay(cell.date, value.end)
                const inRange = window && t > window[0].getTime() && t < window[1].getTime()
                const isFocus = isSameDay(cell.date, focusDate)
                const isToday = isSameDay(cell.date, today)
                const dis = isDayDisabled(cell.date, min, max)
                const highlightEnd = isStart || isEnd || isEndpoint
                return (
                  <div role="gridcell" aria-selected={!!highlightEnd} key={iso} className={cn('flex items-center justify-center p-0.5', inRange && 'bg-accent-subtle')}>
                    <button
                      type="button"
                      data-day={iso}
                      tabIndex={isFocus ? 0 : -1}
                      disabled={dis}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={longFmt.format(cell.date)}
                      onClick={() => pickDay(cell.date)}
                      onMouseEnter={() => selecting && setHoverDate(cell.date)}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-card text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        !cell.inCurrentMonth && !highlightEnd && 'text-text-muted',
                        cell.inCurrentMonth && !highlightEnd && 'text-text',
                        isToday && !highlightEnd && 'ring-1 ring-inset ring-border-strong',
                        inRange && !highlightEnd && 'text-text',
                        highlightEnd && 'bg-accent text-on-accent font-medium',
                        !highlightEnd && !inRange && !dis && 'hover:bg-surface-sunken',
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

  return (
    <div
      className="flex flex-col gap-1.5"
      {...tcl('DateRangePicker', { label, placeholder, disabled, error, numberOfMonths, weekStartsOn })}
    >
      {label && (
        <span id={labelId} className="text-sm font-medium text-text">
          {label}
        </span>
      )}
      <div ref={rootRef} className={cn('relative', className)}>
        <Popover trigger={trigger} open={open} onOpenChange={setOpen} side="bottom" align="start" className="p-0" aria-label="Choose a date range">
          <div ref={containerRef} className="flex flex-col gap-3 p-3 sm:flex-row">
            {presets && presets.length > 0 && (
              <ul className="flex shrink-0 flex-row flex-wrap gap-1 sm:flex-col sm:border-r sm:border-border sm:pr-3" aria-label="Quick ranges">
                {presets.map((p) => (
                  <li key={p.label}>
                    <button
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={cn(
                        'w-full rounded-card px-3 py-1.5 text-left text-sm text-text transition-colors',
                        'hover:bg-surface-sunken',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      )}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative flex gap-4">
              <IconButton
                icon={<ChevronLeft className="size-4" />}
                aria-label="Previous month"
                variant="ghost"
                size="sm"
                className="absolute -left-1 top-0"
                onClick={() => shiftViews(-1)}
              />
              <IconButton
                icon={<ChevronRight className="size-4" />}
                aria-label="Next month"
                variant="ghost"
                size="sm"
                className="absolute -right-1 top-0"
                onClick={() => shiftViews(1)}
              />
              <div className="px-7">{renderMonth(leftView, 'a')}</div>
              {monthsShown === 2 && (
                <div className="hidden px-7 md:block">
                  {renderMonth({ year: lastView.getFullYear(), month: lastView.getMonth() }, 'b')}
                </div>
              )}
            </div>
          </div>
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
