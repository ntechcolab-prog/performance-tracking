'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { Select } from '@/src/ds/components/Select'
import { Table, type Column } from '@/src/ds/components/Table'
import { Textfield } from '@/src/ds/components/Textfield'
import { cn } from '@/src/ds/helpers/cn'
import type { BatchForm, TargetData } from '@/src/shared/data/batchForm'
import { BATCH_STATUSES, TARGET_TYPES } from '@/src/shared/data/batchForm'
import { isLiveMode } from '@/src/shared/data/mockData'
import { getLiveBatchRecord } from '@/src/v2/live/liveBatchStore'
import { statusToDisplay } from '@/src/shared/api/adapters'
import { SectionCard, Stat, KvGroup, KvList, dsTable } from '../ui'
import { EditableCard, useEditing } from '../cardEdit'
import BatchGraph, { GRAPH_WINDOW_START_MIN, GRAPH_WINDOW_END_MIN } from '../BatchGraph'
import { useProductionMonitoring } from '@/src/shared/lib/productionMonitoring'

const TARGET_ROWS = [
  ['Target Type', 'Energy'],
  ['Target Value', '2000.0'],
  ['Maximum Temperature Allowed (°C)', '60'],
]
const PROCESS_ROWS = [
  ['Energy', '978.2 kWh'],
  ['Specific Energy (kWh/kg)', '0.050'],
  ['Estimated Energy Consumption (kWh)', '0.0'],
  ['Total Runtime', '00:00:04'],
  ['Cycles', '0.0'],
]
const MACHINE_BASIC = [
  ['Manufacturer', 'NETZSCH'],
  ['Type', 'Bead Mill'],
  ['Commission number', 'l2500522-10'],
  ['Name', 'ALPHA lll - (30kW) BlueLab'],
  ['Production line', 'Line 2'],
]
const MACHINE_TECH = [
  ['Samba system', 'Yes'],
  ['Grinding technology', 'Neos'],
  ['Inner liner material', 'NE Steel'],
  ['Sieve size', '120 mm'],
  ['Bead material', 'CeraBeads'],
  ['Bead size 1', '8 mm'],
  ['Bead size 2', '12 mm'],
  ['Bead filling level', '75%'],
]

// Pull the "HH:MM[am|pm]" out of an event timestamp and map it to a fraction
// across the chart window (null if it can't be read or falls outside).
function eventTimeToFrac(s: string): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(s)
  if (!m) return null
  let h = Number(m[1])
  const ap = m[3]?.toLowerCase()
  if (ap === 'pm' && h !== 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  const t = h * 60 + Number(m[2])
  if (t < GRAPH_WINDOW_START_MIN || t > GRAPH_WINDOW_END_MIN) return null
  return (t - GRAPH_WINDOW_START_MIN) / (GRAPH_WINDOW_END_MIN - GRAPH_WINDOW_START_MIN)
}

// Floating quick-nav (Resume sections). pmOnly entries only in the PM edition.
const SECTIONS = [
  { id: 'resume-status', label: 'Batch Status' },
  { id: 'resume-details', label: 'Batch Details' },
  { id: 'resume-machine', label: 'Machine Details' },
  { id: 'resume-notes', label: 'Notes' },
  { id: 'resume-graph', label: 'Graph' },
  { id: 'resume-alarms', label: 'Alarms', pmOnly: true },
  { id: 'resume-alerts', label: 'Alerts', pmOnly: true },
  { id: 'resume-log', label: 'Action Log', pmOnly: true },
]

const ALARMS = [
  ['02 Mar 2021 / 11:13am', '02 Mar 2021 / 11:14am', 'Low cooling liquid level'],
  ['02 Mar 2021 / 10:48am', '02 Mar 2021 / 10:49am', 'High product temperature'],
  ['02 Mar 2021 / 10:21am', '02 Mar 2021 / 10:22am', 'Pressure above setpoint'],
  ['02 Mar 2021 / 09:57am', '02 Mar 2021 / 09:58am', 'Low cooling liquid level'],
  ['02 Mar 2021 / 09:30am', '02 Mar 2021 / 09:31am', 'Bead wear warning'],
]
const ALERTS = [
  ['02 Mar 2021 / 11:05am', '02 Mar 2021 / 11:06am', 'Flow rate fluctuation detected'],
  ['02 Mar 2021 / 10:32am', '02 Mar 2021 / 10:33am', 'Mill current near limit'],
  ['02 Mar 2021 / 10:04am', '02 Mar 2021 / 10:05am', 'Cooling pump speed reduced'],
  ['02 Mar 2021 / 09:41am', '02 Mar 2021 / 09:42am', 'Sample interval exceeded'],
]
// [#, description, operator, event, date] — automatic events have no human
// operator, so they are logged as "System".
const ACTIVITY = [
  ['1', 'MR completed by Antoni Newton', 'A. Newton', 'Commissioning ER alarm', '11/05/2021 12:46:34'],
  ['2', 'User logged in', 'A. Newton', 'User Login', '11/05/2021 11:32:08'],
  ['3', 'User logged out', 'M. Hoffmann', 'User Logout', '09/05/2021 18:14:51'],
  ['4', 'Recipe Start: Action Start', 'M. Hoffmann', 'Manual action', '09/05/2021 09:02:10'],
  ['5', 'Recipe Start: Action Start', 'A. Costa', 'Manual action', '08/05/2021 17:48:22'],
  ['6', 'Limit value reached for fill level', 'System', 'Automatic change', '08/05/2021 16:12:03'],
  ['7', 'Batch BA-0074 created', 'J. Tanaka', 'Batch start', '05/05/2021 08:30:00'],
]

const opts = (list: string[]) => list.map((o) => ({ label: o, value: o }))
const unit = (u: string) => <span className="text-sm">{u}</span>

type ActivityRow = { id: string; desc: string; operator: string; event: string; date: string }
const ACTIVITY_COLUMNS: Column<ActivityRow>[] = [
  { key: 'id', header: '#', render: (r) => <span className="text-text-muted tabular-nums">{r.id}</span> },
  { key: 'desc', header: 'Description' },
  { key: 'operator', header: 'Operator', render: (r) => <span className="text-text-muted">{r.operator}</span> },
  { key: 'event', header: 'Event', render: (r) => <span className="text-text-muted">{r.event}</span> },
  { key: 'date', header: 'Date', render: (r) => <span className="whitespace-nowrap text-text-muted tabular-nums">{r.date}</span> },
]

const dash = (v: unknown, unit = ''): string => (v == null || v === '' ? '—' : `${v}${unit ? ` ${unit}` : ''}`)
const fmtDateTime = (iso?: string): string =>
  iso ? new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const durationStr = (a?: string, b?: string): string => {
  if (!a || !b) return '—'
  const ms = new Date(b).getTime() - new Date(a).getTime()
  if (!(ms > 0)) return '—'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// "2026-04-19" + "10:15" → ISO-ish local timestamp (undefined if incomplete).
const periodIso = (date: string, time: string): string | undefined =>
  date ? `${date}T${time || '00:00'}` : undefined

export default function ResumeTab({ form, onChange }: { form: BatchForm; onChange: (v: BatchForm) => void }) {
  const editStatus = useEditing('resume-status')
  const editDetails = useEditing('resume-details')
  // Live: pull the real batch record so the summary shows real values ("—" where
  // there is no backend source).
  const rec = isLiveMode() ? getLiveBatchRecord(form.id) : undefined
  const d = rec?.details
  const p = rec?.property
  // Edited values (form) win over the machine record / mock defaults.
  const statusText = form.status ?? (rec ? statusToDisplay(String(d?.status)) : 'Completed')
  const progressText = form.progress ?? (rec ? String(Math.round(d?.progress ?? 0)) : '100')
  const startIso = periodIso(form.period.startDate, form.period.startTime) ?? d?.date?.start
  const endIso = periodIso(form.period.endDate, form.period.endTime) ?? d?.date?.end
  const lengthText = durationStr(startIso, endIso)
  const startText = fmtDateTime(startIso)
  const endText = fmtDateTime(endIso)
  const target: TargetData = form.target ?? (rec
    ? { type: String(rec.target?.type ?? ''), value: String(rec.target?.value ?? ''), maxTemperature: String(d?.max_allowed_temperature ?? '') }
    : { type: TARGET_ROWS[0][1], value: TARGET_ROWS[1][1], maxTemperature: TARGET_ROWS[2][1] })
  const targetRows: string[][] = [
    ['Target Type', dash(target.type)],
    ['Target Value', dash(target.value)],
    ['Maximum Temperature Allowed (°C)', dash(target.maxTemperature)],
  ]
  // An imported (live) batch comes from the machine: only its period can be corrected.
  const imported = Boolean(rec)
  const setPeriod = (key: keyof BatchForm['period'], v: string) => onChange({ ...form, period: { ...form.period, [key]: v } })
  const setTarget = (key: keyof TargetData, v: string) => onChange({ ...form, target: { ...target, [key]: v } })
  const StatusIcon = statusText === 'Completed' ? CheckCircleIcon : statusText === 'Cancelled' ? CancelIcon : PendingIcon
  const statusColor = statusText === 'Completed' ? 'success.main' : statusText === 'Cancelled' ? 'error.main' : 'warning.main'
  const processRows: string[][] = rec
    ? [
        ['Energy', dash(p?.grinding_energy, 'kWh')],
        ['Specific Energy (kWh/kg)', dash(p?.specific_energy)],
        ['Estimated Energy Consumption (kWh)', dash(p?.est_energy_consumption)],
        ['Total Runtime', dash(p?.total_grinding_time)],
        ['Cycles', dash(d?.cycles)],
      ]
    : PROCESS_ROWS
  const machineBasic: string[][] = rec
    ? [['Manufacturer', dash(rec.machine?.brand ?? 'NETZSCH')], ['Type', dash(rec.machine?.type)]]
    : MACHINE_BASIC

  const [query, setQuery] = useState('')
  const [eventMarker, setEventMarker] = useState<number | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const pmOn = useProductionMonitoring()
  const sections = SECTIONS.filter((s) => pmOn || !s.pmOnly)

  // Scroll-spy: highlight the section currently in view on the floating nav.
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id)
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmOn])

  const jumpTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const activity = ACTIVITY.filter((r) =>
    query.trim() ? r.some((c) => c.toLowerCase().includes(query.trim().toLowerCase())) : true,
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Floating quick-nav — a slim handle on the right edge that slides out on
          hover/focus and highlights the section currently in view. */}
      <Box
        onMouseEnter={() => setNavOpen(true)}
        onMouseLeave={() => setNavOpen(false)}
        sx={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: (t) => t.zIndex.appBar,
          display: { xs: 'none', xl: 'block' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            transition: 'transform 0.3s ease-out',
            transform: navOpen ? 'translateX(0)' : 'translateX(calc(100% - 1.75rem))',
          }}
        >
          {/* Handle — always visible; clicking also toggles (touch / no-hover). */}
          <Box
            component="button"
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Hide sections' : 'Show sections'}
            sx={{
              flexShrink: 0,
              width: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 1.5,
              cursor: 'pointer',
              border: '1px solid',
              borderRight: 'none',
              borderColor: 'divider',
              borderRadius: '16px 0 0 16px',
              bgcolor: 'background.paper',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            }}
          >
            <Box
              component="span"
              sx={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                fontSize: '0.625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'text.disabled',
              }}
            >
              Sections
            </Box>
          </Box>
          {/* Panel */}
          <Box
            component="nav"
            aria-label="Resume sections"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
              p: 0.75,
              pr: 1.5,
              border: '1px solid',
              borderLeft: 'none',
              borderColor: 'divider',
              borderRadius: '0 16px 16px 0',
              bgcolor: 'background.paper',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            }}
          >
            {sections.map((s) => {
              const active = activeSection === s.id
              return (
                <Box
                  key={s.id}
                  component="button"
                  onClick={() => {
                    jumpTo(s.id)
                    setNavOpen(false)
                  }}
                  aria-current={active ? 'true' : undefined}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    borderRadius: 1.5,
                    transition: 'background-color 0.15s, color 0.15s',
                    bgcolor: active ? 'primary.main' : 'transparent',
                    color: active ? 'primary.contrastText' : 'text.secondary',
                    '&:hover': active
                      ? {}
                      : { bgcolor: 'action.hover', color: 'text.primary' },
                  }}
                >
                  {s.label}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>

      <EditableCard cardId="resume-status" title="Batch Status" id="resume-status">
        {editStatus ? (
          <Box>
            {imported && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This batch was imported from the machine. Only its period can be corrected.
              </Typography>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
              <Select
                label="Status"
                value={statusText}
                disabled={imported}
                options={opts(BATCH_STATUSES.includes(statusText) ? BATCH_STATUSES : [statusText, ...BATCH_STATUSES])}
                onChange={(v) => onChange({ ...form, status: v })}
              />
              <Textfield label="Progress (%)" value={progressText} disabled={imported} onChange={(e) => onChange({ ...form, progress: e.target.value })} />
              <Textfield
                label="Total Batch Size" value={form.product.weight} disabled={imported}
                onChange={(e) => onChange({ ...form, product: { ...form.product, weight: e.target.value } })}
                trailingIcon={unit('kg')}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 1 }}>
                <Textfield type="date" label="Start date" value={form.period.startDate} onChange={(e) => setPeriod('startDate', e.target.value)} />
                <Textfield type="time" label="Start time" value={form.period.startTime} onChange={(e) => setPeriod('startTime', e.target.value)} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 1 }}>
                <Textfield type="date" label="End date" value={form.period.endDate} onChange={(e) => setPeriod('endDate', e.target.value)} />
                <Textfield type="time" label="End time" value={form.period.endTime} onChange={(e) => setPeriod('endTime', e.target.value)} />
              </Box>
              <Stat label="Batch Length" value={lengthText} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2.5 }}>
            <Stat label="Status">
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: statusColor, fontWeight: 500 }}>
                <StatusIcon sx={{ fontSize: 16 }} /> {statusText}
              </Box>
            </Stat>
            <Stat label="Progress (%)" value={progressText} />
            <Stat label="Batch Length" value={lengthText} />
            <Stat label="Total Batch Size" value={dash(form.product.weight, 'kg')} />
            <Stat label="Start Time" value={startText} />
            <Stat label="End Time" value={endText} />
          </Box>
        )}
      </EditableCard>

      <EditableCard cardId="resume-details" title="Batch Details" id="resume-details" canEdit={!imported}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          {editDetails ? (
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'primary.dark' }}>Target</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Select
                  label="Target Type"
                  value={target.type}
                  options={opts(TARGET_TYPES.includes(target.type) || !target.type ? TARGET_TYPES : [target.type, ...TARGET_TYPES])}
                  onChange={(v) => setTarget('type', v)}
                />
                <Textfield label="Target Value" value={target.value} onChange={(e) => setTarget('value', e.target.value)} />
                <Textfield
                  label="Maximum Temperature Allowed" value={target.maxTemperature} onChange={(e) => setTarget('maxTemperature', e.target.value)}
                  trailingIcon={unit('°C')}
                />
              </Box>
            </Box>
          ) : (
            <KvGroup heading="Target" rows={targetRows} />
          )}
          {/* Process values are measured by the machine — never edited. */}
          <KvGroup heading="Process" rows={processRows} />
        </Box>
      </EditableCard>

      <SectionCard title="Machine Details" id="resume-machine">
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'primary.dark' }}>Basic information</Typography>
              <KvList rows={machineBasic} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'primary.dark' }}>Technology</Typography>
              <KvList rows={MACHINE_TECH} />
            </Box>
          </Box>
        </Box>
      </SectionCard>

      <SectionCard
        title="Notes"
        id="resume-notes"
        action={<Button size="sm" variant="secondary" leadingIcon={<Plus className="size-4" />}>Add note</Button>}
      >
        <Box sx={{ display: 'grid', placeItems: 'center', py: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
          There are currently no notes in this section.
        </Box>
      </SectionCard>

      <SectionCard title="Graph" id="resume-graph">
        <BatchGraph markerFrac={eventMarker} />
      </SectionCard>

      {pmOn && (
        <SectionCard title="Alarms" id="resume-alarms">
          <EventTable columns={['Batch Time', 'Acknowledge Time', 'Alarm Message']} rows={ALARMS} dot="#c12907" onHoverRow={setEventMarker} />
        </SectionCard>
      )}

      {pmOn && (
        <SectionCard title="Alerts" id="resume-alerts">
          <EventTable columns={['Batch Time', 'Acknowledge Time', 'Alert Message']} rows={ALERTS} dot="#f19909" onHoverRow={setEventMarker} />
        </SectionCard>
      )}

      {pmOn && (
        <SectionCard
          title="Action Log"
          id="resume-log"
          action={
            <Textfield
              value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description…"
              aria-label="Search action log"
              leadingIcon={<Search className="size-4" />}
              className="h-8 w-56"
            />
          }
        >
          {activity.length > 0 ? (
            <Table
              density="compact"
              columns={ACTIVITY_COLUMNS}
              data={activity.map(([id, desc, operator, event, date]) => ({ id, desc, operator, event, date }))}
            />
          ) : (
            <div className="rounded-card border border-border py-8 text-center text-sm text-text-muted">
              No entries match “{query}”.
            </div>
          )}
        </SectionCard>
      )}
    </Box>
  )
}

function EventTable({
  columns,
  rows,
  dot,
  onHoverRow,
}: {
  columns: string[]
  rows: string[][]
  dot: string
  onHoverRow?: (frac: number | null) => void
}) {
  return (
    <div className={dsTable.wrap}>
      <table className={dsTable.table}>
        <thead>
          <tr className={dsTable.headRow}>
            {columns.map((c, i) => <th key={c} scope="col" className={cn(dsTable.th, 'px-3 py-1.5', i < 2 && 'w-[200px]')}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={dsTable.row}
              onMouseEnter={() => onHoverRow?.(eventTimeToFrac(r[0]))}
              onMouseLeave={() => onHoverRow?.(null)}
            >
              <td className={cn(dsTable.td, 'px-3 py-1.5 text-text-muted tabular-nums')}>{r[0]}</td>
              <td className={cn(dsTable.td, 'px-3 py-1.5 text-text-muted tabular-nums')}>{r[1]}</td>
              <td className={cn(dsTable.td, 'px-3 py-1.5')}>
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-round" style={{ backgroundColor: dot }} />
                  {r[2]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
