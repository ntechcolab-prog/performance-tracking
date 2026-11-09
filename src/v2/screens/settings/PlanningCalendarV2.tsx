'use client'

import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { IconButton } from '@/src/ds/components/IconButton'
import { Textfield } from '@/src/ds/components/Textfield'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { Switch } from '@/src/ds/components/Switch'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import { iris } from '@/src/shared/client/mui/theme'
import {
  WEEKDAY_LABELS,
  daysInMonth,
  isoOf,
  plannedHoursForDay,
  type AvailabilitySettings,
  type PlanMap,
  type Weekday,
} from '@/src/shared/lib/availability'

// MUI rebuild of the Tailwind planning calendar. Same planning math (reuses
// plannedHoursForDay + the availability model) — only presentation changes.

interface Props {
  year: number
  month: number // 0-based
  onPrev: () => void
  onNext: () => void
  settings: AvailabilitySettings
  plan: PlanMap
  setPlan: (updater: (prev: PlanMap) => PlanMap) => void
  holidaySet: Set<string>
  holidayName: (iso: string) => string | undefined
  workingHolidays: Set<string>
  onToggleWorkingHoliday: (iso: string, next: boolean) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function buildWeeks(year: number, month: number): (number | null)[][] {
  const total = daysInMonth(year, month)
  const firstDow = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const tintFor = (hours: number, maxHours: number) =>
  `rgba(70,170,159,${(0.12 + 0.32 * Math.min(1, hours / maxHours)).toFixed(3)})`

export default function PlanningCalendarV2({
  year,
  month,
  onPrev,
  onNext,
  settings,
  plan,
  setPlan,
  holidaySet,
  holidayName,
  workingHolidays,
  onToggleWorkingHoliday,
}: Props) {
  const weeks = useMemo(() => buildWeeks(year, month), [year, month])
  const totalDays = daysInMonth(year, month)

  const setDay = (iso: string, hours: number) => setPlan((prev) => ({ ...prev, [iso]: hours }))

  const maxHours = useMemo(() => {
    const defaults = Object.values(settings.defaultHoursByWeekday)
    const planned = Object.entries(plan)
      .filter(([iso]) => iso.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .map(([, h]) => h)
    return Math.max(8, ...defaults, ...planned)
  }, [settings.defaultHoursByWeekday, plan, year, month])

  const summary = useMemo(() => {
    let planned = 0
    let workingDays = 0
    let holidayCount = 0
    let offDays = 0
    for (let d = 1; d <= totalDays; d++) {
      const iso = isoOf(year, month, d)
      const h = plannedHoursForDay(iso, plan, settings, holidaySet, workingHolidays)
      if (holidaySet.has(iso)) holidayCount++
      if (h > 0) {
        planned += h
        workingDays++
      } else {
        offDays++
      }
    }
    return { planned, workingDays, holidayCount, offDays }
  }, [year, month, totalDays, plan, settings, holidaySet, workingHolidays])

  const todayIso = isoOf(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  return (
    <Box>
      {/* Month nav */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={onPrev} aria-label="Previous month" size="sm" variant="secondary" icon={<ChevronLeftIcon fontSize="small" />} />
        <Typography sx={{ minWidth: '9.5rem', textAlign: 'center', fontWeight: 600, color: 'text.primary' }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton onClick={onNext} aria-label="Next month" size="sm" variant="secondary" icon={<ChevronRightIcon fontSize="small" />} />
      </Box>

      {/* Summary strip */}
      <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <SummaryStat label="Planned hours" value={`${summary.planned}h`} tone="primary" />
        <SummaryStat label="Working days" value={String(summary.workingDays)} />
        <SummaryStat label="Days off" value={String(summary.offDays)} />
        <SummaryStat label="Holidays" value={String(summary.holidayCount)} tone="warning" />
      </Box>

      {/* Calendar grid */}
      <Box sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        {/* Weekday header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid', borderColor: 'divider', bgcolor: iris.page }}>
          {WEEKDAY_LABELS.map((w, i) => (
            <Typography
              key={w}
              variant="caption"
              sx={{
                px: 1, py: 1, textAlign: 'center', fontWeight: 600, letterSpacing: '0.05em',
                textTransform: 'uppercase', fontSize: '0.6875rem',
                color: settings.workingDays.includes(i as Weekday) ? 'text.primary' : 'text.disabled',
              }}
            >
              {w}
            </Typography>
          ))}
        </Box>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <Box
            key={wi}
            sx={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: wi < weeks.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
            }}
          >
            {week.map((day, di) => {
              if (day == null) {
                return <Box key={di} sx={{ minHeight: '6rem', borderRight: di < 6 ? '1px solid' : 'none', borderColor: 'divider', bgcolor: 'rgba(246,246,246,0.3)' }} />
              }
              const iso = isoOf(year, month, day)
              const weekday = di as Weekday
              const isHoliday = holidaySet.has(iso)
              const isWorkingWeekday = settings.workingDays.includes(weekday)
              const holidayWorking = isHoliday && workingHolidays.has(iso)
              const editable = isHoliday ? holidayWorking : isWorkingWeekday || (plan[iso] ?? 0) > 0
              const hours = plannedHoursForDay(iso, plan, settings, holidaySet, workingHolidays)
              return (
                <DayPlanCell
                  key={di}
                  day={day}
                  hours={hours}
                  editable={editable}
                  isHoliday={isHoliday}
                  holidayLabel={isHoliday ? holidayName(iso) : undefined}
                  isOverride={iso in plan}
                  isToday={iso === todayIso}
                  maxHours={maxHours}
                  lastCol={di === 6}
                  onSet={(h) => setDay(iso, h)}
                  onToggleHolidayWorking={isHoliday ? (next) => onToggleWorkingHoliday(iso, next) : undefined}
                />
              )
            })}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 2.5, rowGap: 1 }}>
        <LegendItem swatch={<Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'rgba(70,170,159,0.4)' }} />} label="Planned hours" />
        <LegendItem swatch={<Box sx={{ width: 12, height: 12, borderRadius: 0.5, border: '1px dashed', borderColor: 'text.disabled', bgcolor: '#fff' }} />} label="Not set yet" />
        <LegendItem swatch={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />} label="Edited" />
        <LegendItem swatch={<WbSunnyOutlinedIcon sx={{ fontSize: 14, color: 'warning.main' }} />} label="Holiday" />
        <LegendItem swatch={<Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: iris.page }} />} label="Day off" />
      </Box>
    </Box>
  )
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {swatch}
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'warning' }) {
  const color = tone === 'primary' ? 'primary.main' : tone === 'warning' ? 'warning.main' : 'text.primary'
  return (
    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#fff', px: 1.75, py: 1.25 }}>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.25, fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>
        {value}
      </Typography>
    </Box>
  )
}

function DayPlanCell({
  day,
  hours,
  editable,
  isHoliday,
  holidayLabel,
  isOverride,
  isToday,
  maxHours,
  lastCol,
  onSet,
  onToggleHolidayWorking,
}: {
  day: number
  hours: number
  editable: boolean
  isHoliday: boolean
  holidayLabel?: string
  isOverride: boolean
  isToday: boolean
  maxHours: number
  lastCol: boolean
  onSet: (h: number) => void
  onToggleHolidayWorking?: (next: boolean) => void
}) {
  const hasHours = hours > 0
  const tint = editable && hasHours ? tintFor(hours, maxHours) : undefined
  const bg = tint ?? (isHoliday && !editable ? '#fdf3e2' : !editable ? 'rgba(246,246,246,0.5)' : undefined)

  const cell = (
      <Box
        sx={{
          position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '6rem', p: 1,
          borderRight: lastCol ? 'none' : '1px solid', borderColor: 'divider',
          background: bg,
          ...(isToday ? { outline: '2px solid', outlineOffset: '-2px', outlineColor: 'rgba(70,170,159,0.6)' } : {}),
        }}
      >
        {/* day number + markers */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: editable ? 'text.primary' : 'text.disabled' }}>
            {String(day).padStart(2, '0')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isOverride && editable && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />}
            {isHoliday && <WbSunnyOutlinedIcon sx={{ fontSize: 13, color: 'warning.main' }} />}
          </Box>
        </Box>

        {/* body */}
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          {!editable ? (
            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 500, color: 'text.disabled' }}>
                {isHoliday ? 'Holiday' : 'Day off'}
              </Typography>
              {isHoliday && holidayLabel && (
                <Typography noWrap sx={{ mt: 0.25, fontSize: '0.625rem', color: 'text.secondary' }}>
                  {holidayLabel}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ mt: 0.75 }}>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, borderRadius: 1.5,
                  ...(hasHours ? {} : { border: '1px dashed', borderColor: 'text.disabled' }),
                }}
              >
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Decrease hours"
                  onClick={() => onSet(Math.max(0, Math.round((hours - 1) * 2) / 2))}
                  className="size-7 shrink-0 text-text-muted"
                  icon={<RemoveIcon fontSize="small" />}
                />
                <div className="w-10">
                  <Textfield
                    type="number"
                    min={0}
                    step={0.5}
                    aria-label={`Day ${day} hours`}
                    value={hours}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : Number(e.target.value)
                      onSet(Number.isFinite(v) ? Math.max(0, v) : 0)
                    }}
                    className={`h-7 [appearance:textfield] border-0 bg-transparent px-0 text-center font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${hasHours ? 'text-text' : 'text-text-subtle'}`}
                  />
                </div>
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Increase hours"
                  onClick={() => onSet(Math.round((hours + 1) * 2) / 2)}
                  className="size-7 shrink-0 text-text-muted"
                  icon={<AddIcon fontSize="small" />}
                />
              </Box>
              {!hasHours && (
                <Typography sx={{ mt: 0.5, textAlign: 'center', fontSize: '0.5625rem', color: 'text.disabled' }}>
                  not set
                </Typography>
              )}
            </Box>
          )}

          {/* per-holiday working-day toggle */}
          {isHoliday && onToggleHolidayWorking && (
            <Box
              sx={{ mt: 'auto', pt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => onToggleHolidayWorking(!editable)}
            >
              <span className="-mr-2 inline-flex origin-left scale-[0.7]" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={editable}
                  aria-label="Working day"
                  onChange={(next) => onToggleHolidayWorking(next)}
                />
              </span>
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 500 }}>Working day</Typography>
            </Box>
          )}
        </Box>
      </Box>
  )

  return holidayLabel ? <Tooltip content={holidayLabel}>{cell}</Tooltip> : cell
}
