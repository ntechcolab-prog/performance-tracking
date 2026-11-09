/**
 * Pure, dependency-free date helpers for the calendar components.
 *
 * Everything here uses the **native** `Date` and operates on *local* calendar
 * fields (no UTC, no libraries) so a day rendered in the grid is the same day
 * the user sees on their wall clock. Shared by DatePicker and DateRangePicker.
 */

/** A single cell in the month grid. */
export interface CalendarDay {
  /** The calendar date this cell represents (local, midnight). */
  date: Date
  /** Whether the date falls inside the month being displayed. */
  inCurrentMonth: boolean
}

/** First day of the week: 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1

/** Number of days in a given month (`month` is 0-indexed). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Build a 6-row × 7-column grid for `month` (0-indexed) of `year`.
 *
 * The grid always has 42 cells so the calendar never changes height between
 * months. Cells outside the displayed month carry `inCurrentMonth: false`.
 */
export function getMonthMatrix(
  year: number,
  month: number,
  weekStartsOn: WeekStart = 1,
): CalendarDay[][] {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = firstOfMonth.getDay() // 0 (Sun) … 6 (Sat)
  // How many leading days from the previous month we must show.
  const offset = (firstWeekday - weekStartsOn + 7) % 7
  const start = new Date(year, month, 1 - offset)

  const weeks: CalendarDay[][] = []
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (w * 7 + d))
      week.push({ date, inCurrentMonth: date.getMonth() === month })
    }
    weeks.push(week)
  }
  return weeks
}

/** True when `a` and `b` are the same local calendar day. */
export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Add `n` calendar months to `date`, clamping the day to the last valid day of
 * the target month (so Jan 31 + 1 → Feb 28/29, never March 2/3).
 */
export function addMonths(date: Date, n: number): Date {
  const targetMonthDays = daysInMonth(date.getFullYear(), date.getMonth() + n)
  const day = Math.min(date.getDate(), targetMonthDays)
  return new Date(date.getFullYear(), date.getMonth() + n, day)
}

/** Clamp `d` into the inclusive `[min, max]` window when bounds are given. */
export function clampDate(d: Date, min?: Date | null, max?: Date | null): Date {
  if (min && d.getTime() < min.getTime()) return min
  if (max && d.getTime() > max.getTime()) return max
  return d
}

/** Format `date` as `yyyy-mm-dd` using *local* fields. */
export function formatISO(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Is `day` strictly before `min` or after `max`? Used to disable out-of-range
 * cells. Comparison is day-granular (time of day is ignored).
 */
export function isDayDisabled(day: Date, min?: Date | null, max?: Date | null): boolean {
  if (min && day.getTime() < startOfDay(min).getTime()) return true
  if (max && day.getTime() > startOfDay(max).getTime()) return true
  return false
}

/** Midnight of the given date (local). */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
