'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Button } from '@/src/ds/components/Button'
import { IconButton } from '@/src/ds/components/IconButton'
import { Textfield } from '@/src/ds/components/Textfield'
import { SegmentedControl } from '@/src/ds/components/SegmentedControl'
import { Badge } from '@/src/ds/components/Badge'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  WEEKDAY_LONG,
  parseISO,
  toISO,
  isoOf,
  daysInMonth,
  plannedHoursForMonth,
  useAvailabilitySettings,
  useAvailabilityPlan,
  useWorkingHolidays,
  type Weekday,
} from '@/src/shared/lib/availability'
import { useHolidays } from '@/src/shared/lib/holidays'
import { parseAssistant, type ParsedRule } from '@/src/shared/lib/assistantParser'
import { FormSectionV2, FieldV2 } from './settingsUi'
import PlanningCalendarV2 from './PlanningCalendarV2'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AvailabilitySettingsV2() {
  const [settings, setSettings] = useAvailabilitySettings()
  const [plan, setPlan] = useAvailabilityPlan()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const holidays = useHolidays(year)
  const workingHols = useWorkingHolidays()

  const [showApplyPeriod, setShowApplyPeriod] = useState(false)
  const [applyStart, setApplyStart] = useState('')
  const [applyEnd, setApplyEnd] = useState('')

  const [scheduleMode, setScheduleMode] = useState<'manual' | 'assistant'>('manual')

  const [assistantText, setAssistantText] = useState('')
  const [preview, setPreview] = useState<ParsedRule | null>(null)
  const parseAssistantNow = () => setPreview(parseAssistant(assistantText))
  const applyAssistant = () => {
    if (!preview) return
    setPlan((prev) => {
      const next = { ...prev }
      const n = daysInMonth(year, month)
      const bound = preview.untilDay ?? n
      for (let d = 1; d <= Math.min(bound, n); d++) {
        const wd = new Date(year, month, d).getDay() as Weekday
        const h = preview.hoursByWeekday[wd]
        if (h != null) next[isoOf(year, month, d)] = h
      }
      return next
    })
    setPreview(null)
    setAssistantText('')
  }

  const applyRange = () => {
    if (!applyStart || !applyEnd) return
    const start = parseISO(applyStart)
    const end = parseISO(applyEnd)
    if (end < start) return
    setPlan((prev) => {
      const next = { ...prev }
      const cur = new Date(start)
      while (cur <= end) {
        const iso = toISO(cur)
        const wd = cur.getDay() as Weekday
        let h = 0
        if (holidays.set.has(iso)) h = workingHols.set.has(iso) ? settings.defaultHoursByWeekday[wd] ?? 0 : 0
        else if (settings.workingDays.includes(wd)) h = settings.defaultHoursByWeekday[wd] ?? 0
        next[iso] = h
        cur.setDate(cur.getDate() + 1)
      }
      return next
    })
  }

  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const addHoliday = () => {
    if (!newHolidayDate) return
    holidays.add(newHolidayDate, newHolidayName || 'Custom holiday')
    setNewHolidayDate('')
    setNewHolidayName('')
    setShowAddHoliday(false)
  }

  const importHolidays = async () => {
    setImporting(true)
    setImportMsg(null)
    try {
      const n = await holidays.importYear(year)
      setImportMsg(n > 0 ? `Imported ${n} holiday${n === 1 ? '' : 's'} for ${year}.` : `No new holidays to import for ${year}.`)
    } catch {
      setImportMsg('Could not reach the holidays service. Check your connection and try again.')
    } finally {
      setImporting(false)
    }
  }

  const toggleWorkingDay = (d: Weekday) =>
    setSettings((prev) => {
      const has = prev.workingDays.includes(d)
      const workingDays = has
        ? prev.workingDays.filter((w) => w !== d)
        : [...prev.workingDays, d].sort((a, b) => a - b)
      return { ...prev, workingDays }
    })

  const setDefaultHours = (d: Weekday, hours: number) =>
    setSettings((prev) => ({
      ...prev,
      defaultHoursByWeekday: { ...prev.defaultHoursByWeekday, [d]: hours },
    }))

  const monthTotal = plannedHoursForMonth(year, month, plan, settings, holidays.set, workingHols.set)

  const prevMonth = () =>
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  const nextMonth = () =>
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1)
        return 0
      }
      return m + 1
    })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Availability target */}
      <FormSectionV2 title="Availability target">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <FieldV2 label="Monthly availability target">
            <Textfield
              type="number"
              min={0}
              max={100}
              value={settings.monthlyGoalPct}
              onChange={(e) => {
                const n = e.target.value === '' ? 0 : Number(e.target.value)
                setSettings((p) => ({ ...p, monthlyGoalPct: Math.max(0, Math.min(100, n)) }))
              }}
              trailingIcon={<span className="text-sm text-text-muted">%</span>}
            />
          </FieldV2>
        </Box>
        <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>
          The availability goal for the month — used across the dashboard, the monthly goal card and
          the machine rankings to flag whether availability is on track.
        </Typography>
      </FormSectionV2>

      {/* Working schedule */}
      <FormSectionV2 title="Working schedule">
        <SegmentedControl
          size="sm"
          aria-label="Schedule mode"
          value={scheduleMode}
          onChange={(v) => v && setScheduleMode(v as 'manual' | 'assistant')}
          options={[
            { value: 'manual', label: 'Manual configuration' },
            { value: 'assistant', label: 'Planning assistant' },
          ]}
          className="mb-5"
        />

        {scheduleMode === 'manual' ? (
          <>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Working days · select a day to set its hours
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1 }}>
              {WEEKDAYS.map((d) => {
                const on = settings.workingDays.includes(d)
                return (
                  <Box key={d} sx={{ width: '4.75rem', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Button
                      variant={on ? 'primary' : 'secondary'}
                      onClick={() => toggleWorkingDay(d)}
                      aria-pressed={on}
                      className={on ? 'px-2' : 'px-2 border-border text-text-muted'}
                    >
                      {WEEKDAY_LABELS[d]}
                    </Button>
                    {on && (
                      <Textfield
                        type="number"
                        min={0}
                        step={0.5}
                        aria-label={`${WEEKDAY_LONG[d]} hours`}
                        value={settings.defaultHoursByWeekday[d] ?? 0}
                        onChange={(e) => setDefaultHours(d, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                        trailingIcon={<span className="text-xs text-text-muted">h</span>}
                        className="pl-2 pr-6 text-center font-semibold"
                      />
                    )}
                  </Box>
                )
              })}
              <Button
                variant="primary"
                onClick={() => setShowApplyPeriod((v) => !v)}
                aria-expanded={showApplyPeriod}
                leadingIcon={<KeyboardArrowDownIcon fontSize="small" sx={{ transition: 'transform 0.2s', transform: showApplyPeriod ? 'rotate(180deg)' : 'none' }} />}
                className="ml-auto shrink-0"
              >
                Apply schedule to a period
              </Button>
            </Box>

            {showApplyPeriod && (
              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1.5 }}>
                  <FieldV2 label="Start" sx={{ width: '11rem' }}>
                    <Textfield type="date" value={applyStart} onChange={(e) => setApplyStart(e.target.value)} />
                  </FieldV2>
                  <FieldV2 label="End" sx={{ width: '11rem' }}>
                    <Textfield type="date" value={applyEnd} onChange={(e) => setApplyEnd(e.target.value)} />
                  </FieldV2>
                  <Button variant="primary" onClick={applyRange} disabled={!applyStart || !applyEnd}>
                    Apply
                  </Button>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                  Fills every day in the range with its weekday&apos;s hours (non-working days and holidays stay off
                  unless marked as working).
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, color: 'text.primary' }}>
              Use the Planning assistant
            </Typography>
            <Typography variant="caption" sx={{ mb: 1.5, display: 'block', color: 'text.secondary' }}>
              Describe the plan in plain English — applied to {MONTH_NAMES[month]} {year} (the month shown in the calendar below).
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
              <div className="min-w-0 flex-1">
              <Textfield
                value={assistantText}
                onChange={(e) => {
                  setAssistantText(e.target.value)
                  setPreview(null)
                }}
                placeholder="Mondays, Tuesdays and Wednesdays for 8h, Thursdays and Fridays for 4h until day 20"
              />
              </div>
              <Button variant="primary" onClick={parseAssistantNow} disabled={!assistantText.trim()} className="shrink-0">
                Parse
              </Button>
            </Box>

            {preview && (
              <Box sx={{ mt: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(246,246,246,0.5)', p: 1.5 }}>
                {Object.keys(preview.hoursByWeekday).length === 0 ? (
                  <Typography variant="body2" color="error.main">Couldn&apos;t read any weekday + hours from that.</Typography>
                ) : (
                  <>
                    <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                      Parsed plan
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {(Object.entries(preview.hoursByWeekday) as [string, number][])
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([wd, h]) => (
                          <Badge key={wd} variant="accent" size="sm">
                            {`${WEEKDAY_LONG[Number(wd)]} · ${h}h`}
                          </Badge>
                        ))}
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                      {preview.untilDay ? `Applies to days 1–${preview.untilDay}.` : 'Applies to the whole month.'}
                    </Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                      <Button variant="primary" size="sm" onClick={applyAssistant}>Apply</Button>
                      <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>
                        Cancel
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        )}
      </FormSectionV2>

      {/* Planning calendar */}
      <FormSectionV2
        title="Planning calendar"
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
            <CalendarMonthOutlinedIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" color="text.secondary">{monthTotal} h planned this month</Typography>
          </Box>
        }
      >
        <PlanningCalendarV2
          year={year}
          month={month}
          onPrev={prevMonth}
          onNext={nextMonth}
          settings={settings}
          plan={plan}
          setPlan={setPlan}
          holidaySet={holidays.set}
          holidayName={holidays.nameOf}
          workingHolidays={workingHols.set}
          onToggleWorkingHoliday={workingHols.setWorking}
        />
      </FormSectionV2>

      {/* Holidays */}
      <FormSectionV2
        title={`Holidays · ${year}`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={importHolidays}
              disabled={importing}
              leadingIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
            >
              {importing ? 'Importing…' : 'Import holidays'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddHoliday((v) => !v)}
              leadingIcon={<AddIcon sx={{ fontSize: 16 }} />}
            >
              Add Holiday
            </Button>
          </Box>
        }
      >
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <InfoOutlinedIcon sx={{ mt: 0.25, fontSize: 15, color: 'primary.main', flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary">
            Holidays are days off in the calendar above. Need to produce on one? Toggle
            “Working day” on that day. Add your own holidays, or import the public list for {year}.
          </Typography>
        </Box>

        {importMsg && (
          <Typography variant="caption" sx={{ mb: 1.5, display: 'block', borderRadius: 2, bgcolor: 'background.default', px: 1.5, py: 1, color: 'text.secondary' }}>
            {importMsg}
          </Typography>
        )}

        {showAddHoliday && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(246,246,246,0.6)', p: 1.5 }}>
            <FieldV2 label="Date" sx={{ width: '11rem' }}>
              <Textfield type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
            </FieldV2>
            <FieldV2 label="Name" sx={{ flex: 1, minWidth: '12rem' }}>
              <Textfield value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} placeholder="e.g. Company anniversary" />
            </FieldV2>
            <Button variant="primary" onClick={addHoliday} disabled={!newHolidayDate}>Add</Button>
          </Box>
        )}

        {holidays.holidays.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            No holidays for {year}. Add one or import the public list.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1 }}>
            {holidays.holidays.map((h) => {
              const d = parseISO(h.date)
              const label = `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
              const custom = holidays.isCustom(h.date)
              return (
                <Box key={h.date} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#fff', px: 1.5, py: 1.25 }}>
                  <WbSunnyOutlinedIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: 'text.primary' }}>{h.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                  {custom && (
                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${h.name}`}
                      onClick={() => holidays.remove(h.date)}
                      className="shrink-0 text-text-subtle"
                      icon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                    />
                  )}
                </Box>
              )
            })}
          </Box>
        )}
      </FormSectionV2>
    </Box>
  )
}
