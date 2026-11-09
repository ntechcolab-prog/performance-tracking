'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '@/src/ds/components/Card'
import { IconButton } from '@/src/ds/components/IconButton'
import { Select } from '@/src/ds/components/Select'
import { SegmentedControl } from '@/src/ds/components/SegmentedControl'
import { Divider } from '@/src/ds/components/Divider'
import { cn } from '@/src/ds/helpers/cn'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { EChartsOption } from 'echarts'
import EChart from '@/src/v2/components/echarts/EChart'

import {
  useAvailabilitySettings,
  useAvailabilityPlan,
  useWorkingHolidays,
  useDashboardPrefs,
  toISO,
  parseISO,
  type ChartType,
} from '@/src/shared/lib/availability'
import { useHolidays } from '@/src/shared/lib/holidays'
import { availabilityService, type SeriesResult } from '@/src/shared/data/availabilityData'
import { MACHINES } from '@/src/shared/data/mockData'
import { PRODUCTION_LINES } from '@/src/shared/data/appData'
import { iris } from '@/src/shared/client/mui/theme'
import { withAlpha } from '@/src/shared/viz/metricViz'

// MUI-native rewrite of components/MachineTab.tsx (+ AvailabilityDashboard +
// MachineRankingBoard). Reuses the entire availability service/hooks — no math
// is reimplemented here. Charts are ECharts (via the shared EChart wrapper),
// with smooth:false enforced on every line/area series per the manufacturing
// charting rule.
//
// Faithfully reproduced: the attack-focus Availability Ranking board, the
// line/machine scope selectors, and the availability card grid (Today, Yesterday,
// Goal, Month, per-machine Ranking, Year) with independent month/year steppers,
// gauges, per-card chart-type switching (persisted via useDashboardPrefs), and
// the selected-machine highlight.
//
// staged for follow-up: edit-mode drag-reorder/add-remove of the cards, the
// slide-over chart detail panel, and the XLSX/print ExportMenu. The tab renders
// and is fully useful without them.

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// --- shared small building blocks ---

function CardShell({
  title, toolbar, children, className,
}: { title: string; toolbar?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('flex h-full flex-col p-4', className)}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>{title}</Typography>
        {toolbar}
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Card>
  )
}

function MonthStepper({
  label, onPrev, onNext, disableNext, minWidth = 120,
}: { label: string; onPrev: () => void; onNext: () => void; disableNext?: boolean; minWidth?: number | string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <IconButton variant="ghost" size="sm" onClick={onPrev} aria-label="Previous month" icon={<ChevronLeftIcon fontSize="small" />} className="text-text-muted" />
      <Typography variant="body2" sx={{ minWidth, textAlign: 'center', fontWeight: 500, color: 'text.primary' }}>{label}</Typography>
      <IconButton variant="ghost" size="sm" onClick={onNext} disabled={disableNext} aria-label="Next month" icon={<ChevronRightIcon fontSize="small" />} className="text-text-muted" />
    </Box>
  )
}

function AvailGauge({ value, goal, size = 128 }: { value: number; goal: number; size?: number }) {
  const below = value < goal
  const color = below ? iris.warning : iris.primary
  const v = value == null ? 0 : Math.round(value)
  const arcWidth = Math.round(size * 0.09)
  // 220° arc centered on top: ECharts angle 0 = 3 o'clock, CCW positive.
  // top = 90°, half-span = 110° → start 200, end -20 (drawn clockwise).
  const option: EChartsOption = {
    tooltip: { show: false },
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      radius: '92%',
      center: ['50%', '58%'],
      progress: { show: true, width: arcWidth, roundCap: true, itemStyle: { color } },
      axisLine: { lineStyle: { width: arcWidth, color: [[1, withAlpha(color, 0.16)]] } },
      pointer: { show: false },
      anchor: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: false },
      detail: {
        valueAnimation: true,
        formatter: '{v|' + v + '%}',
        rich: { v: { color: iris.ink, fontSize: Math.round(size * 0.16), fontWeight: 700 } },
        offsetCenter: [0, 0],
      },
      data: [{ value: v }],
    }],
  }
  return (
    <Box sx={{ width: size, height: size }}>
      <EChart option={option} height={size} />
    </Box>
  )
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Bars' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
]

function ChartTypeToggle({ value, onChange }: { value: ChartType; onChange: (t: ChartType) => void }) {
  return (
    <SegmentedControl
      size="sm"
      aria-label="Chart type"
      options={CHART_TYPES}
      value={value}
      onChange={(v) => onChange(v as ChartType)}
    />
  )
}

// Availability series chart — bar / line / area, with a dashed goal reference
// line. Reuses the SeriesResult straight from the availability service.
function AvailChart({ series, type, goal, height }: { series: SeriesResult; type: ChartType; goal: number; height: number }) {
  // Dashed goal line (muted) attached to the series via markLine.
  const goalMarkLine = {
    silent: true,
    symbol: 'none' as const,
    data: [{ yAxis: goal }],
    lineStyle: { color: iris.muted, type: 'dashed' as const, width: 1 },
    label: {
      formatter: `Goal ${goal}%`,
      position: 'insideStartTop' as const,
      color: iris.muted,
      fontSize: 10,
    },
  }

  const baseSeries =
    type === 'bar'
      ? {
          type: 'bar' as const,
          data: series.pct,
          itemStyle: { color: iris.primary, borderRadius: [2, 2, 0, 0] as [number, number, number, number] },
          markLine: goalMarkLine,
        }
      : {
          type: 'line' as const,
          data: series.pct,
          smooth: false,
          symbol: 'none' as const,
          lineStyle: { color: iris.primary, width: 2 },
          itemStyle: { color: iris.primary },
          ...(type === 'area' ? { areaStyle: { color: withAlpha(iris.primary, 0.18) } } : {}),
          markLine: goalMarkLine,
        }

  const option: EChartsOption = {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (v == null ? '' : `${v as number}%`),
    },
    xAxis: {
      type: 'category',
      data: series.labels,
      boundaryGap: type === 'bar',
    },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [baseSeries],
  }
  return <EChart option={option} height={height} />
}

function seriesCaption(s: SeriesResult, dayWord: string): string {
  if (!s.pct.length) return ''
  const avg = Math.round(s.pct.reduce((a, b) => a + b, 0) / s.pct.length)
  let best = 0
  let worst = 0
  s.pct.forEach((v, i) => {
    if (v > s.pct[best]) best = i
    if (v < s.pct[worst]) worst = i
  })
  return `Avg ${avg}% · Best ${dayWord} ${s.labels[best]} (${s.pct[best]}%) · Worst ${dayWord} ${s.labels[worst]} (${s.pct[worst]}%)`
}

// --- attack-focus ranking board (top of the tab) ---

function AvailabilityRankingBoard({ goal }: { goal: number }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const atCurrent = year === now.getFullYear() && month === now.getMonth()

  const step = (dir: number) => {
    let m = month + dir
    let y = year
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return
    setMonth(m); setYear(y)
  }

  // Worst-first, best-last (attack focus).
  const rows = useMemo(() => availabilityService.machineRankingDetailed(year, month, MACHINES), [year, month])
  const belowCount = rows.filter((r) => r.pct < goal).length

  const machines = rows.map((r) => r.machine)
  const rankingOption: EChartsOption = {
    grid: { left: 4, right: 8, top: 24, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '' : `${v as number}%`) },
    xAxis: { type: 'category', data: machines },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar',
      data: rows.map((r) => ({
        value: r.pct,
        itemStyle: {
          color: r.pct < goal ? iris.warning : iris.primary,
          borderRadius: [2, 2, 0, 0],
        },
      })),
      markLine: {
        silent: true,
        symbol: 'none',
        data: [{ yAxis: goal }],
        lineStyle: { color: iris.primary, type: 'dashed', width: 1 },
        label: { formatter: `Goal ${goal}%`, position: 'insideEndTop', color: iris.primary, fontSize: 10 },
      },
    }],
  }

  return (
    <Card className="p-5">
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.primary' }}>
            Availability Ranking
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
            Lowest availability first — prioritize the left of the chart.
            {belowCount > 0 && (
              <>
                {' '}<Box component="span" sx={{ fontWeight: 600, color: 'warning.main' }}>{belowCount}</Box> below the {goal}% goal.
              </>
            )}
          </Typography>
        </Box>
        <MonthStepper
          label={`${MONTH_LABELS[month]} ${year}`}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          disableNext={atCurrent}
        />
      </Box>

      <EChart option={rankingOption} height={260} />
    </Card>
  )
}

// --- per-machine ranking card (inside the availability grid) ---

function MachineRankingCard({ goal, selectedMachine }: { goal: number; selectedMachine: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const step = (dir: number) => {
    let m = month + dir
    let y = year
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  // Best-first for the "Best:" caption.
  const ranking = useMemo(() => availabilityService.machineRanking(year, month, MACHINES), [year, month])
  const best = ranking[0]
  const axisMax = 100

  return (
    <CardShell
      title="Machine Ranking"
      toolbar={
        <MonthStepper
          label={`${MONTH_LABELS[month].slice(0, 3)} ${year}`}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          minWidth={72}
        />
      }
    >
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1.5 }}>
        Performance vs goal {goal}%
        {selectedMachine && (
          <>
            {' '}· <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>{selectedMachine}</Box> highlighted
          </>
        )}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {ranking.map((r) => {
          const dim = selectedMachine && r.machine !== selectedMachine
          const color = r.pct >= goal ? iris.primary : iris.warning
          return (
            <Box key={r.machine} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: dim ? 0.45 : 1 }}>
              <Typography variant="caption" noWrap sx={{ width: 64, flexShrink: 0, color: 'text.secondary' }} title={r.machine}>
                {r.machine}
              </Typography>
              <Box sx={{ position: 'relative', flex: 1, height: 16, borderRadius: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                <Box sx={{ position: 'absolute', inset: 0, width: `${(r.pct / axisMax) * 100}%`, bgcolor: color, borderRadius: 1,
                  transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
              </Box>
              <Typography variant="caption" sx={{ width: 30, flexShrink: 0, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: r.pct >= goal ? 'success.main' : 'warning.main' }}>
                {r.pct}%
              </Typography>
            </Box>
          )
        })}
      </Box>
      {best && (
        <>
          <Divider className="mb-2 mt-3" />
          <Typography variant="caption" align="center" sx={{ display: 'block', color: 'text.secondary' }}>
            Best: <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{best.machine}</Box> ({best.pct}%)
          </Typography>
        </>
      )}
    </CardShell>
  )
}

// --- Today bars ---

function TodayBars({ planned, executed, pct }: { planned: number; executed: number; pct: number }) {
  const below = pct < 100
  const option: EChartsOption = {
    grid: { left: 4, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '' : `${v as number}h`) },
    xAxis: { type: 'category', data: ['Planned', 'Executed'] },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}h' } },
    series: [{
      type: 'bar',
      barWidth: '52%',
      data: [
        { value: planned, itemStyle: { color: '#cfe0dd', borderRadius: [2, 2, 0, 0] } },
        { value: executed, itemStyle: { color: below ? '#f0b54d' : iris.primary, borderRadius: [2, 2, 0, 0] } },
      ],
    }],
  }
  return (
    <Box>
      <EChart option={option} height={150} />
      <Typography variant="body2" align="center" sx={{ fontWeight: 600, color: 'text.primary' }}>
        Availability{' '}
        <Box component="span" sx={{ color: below ? 'warning.main' : 'success.main' }}>{Math.round(pct)}%</Box>
      </Typography>
    </Box>
  )
}

// --- main tab ---

export default function MachineTabV2() {
  const [settings] = useAvailabilitySettings()
  const [plan] = useAvailabilityPlan()
  const wh = useWorkingHolidays()
  const { typeFor, setCard } = useDashboardPrefs()
  const goal = settings.monthlyGoalPct

  const [line, setLine] = useState(PRODUCTION_LINES[0])
  const [machine, setMachine] = useState(MACHINES[0])

  const now = new Date()
  const todayIso = toISO(now)
  const yIso = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewMonthYear, setViewMonthYear] = useState(now.getFullYear())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const hToday = useHolidays(now.getFullYear())
  const hMonth = useHolidays(viewMonthYear)
  const hYear = useHolidays(viewYear)

  const today = useMemo(
    () => availabilityService.day(todayIso, plan, settings, hToday.set, wh.set),
    [todayIso, plan, settings, hToday.set, wh.set])
  const yesterday = useMemo(
    () => availabilityService.day(yIso, plan, settings, hToday.set, wh.set),
    [yIso, plan, settings, hToday.set, wh.set])
  const monthSeries = useMemo(
    () => availabilityService.monthSeries(viewMonthYear, viewMonth, plan, settings, hMonth.set, wh.set),
    [viewMonthYear, viewMonth, plan, settings, hMonth.set, wh.set])
  const yearSeries = useMemo(
    () => availabilityService.yearSeries(viewYear, plan, settings, hYear.set, wh.set),
    [viewYear, plan, settings, hYear.set, wh.set])

  const stepMonth = (dir: number) => {
    let m = viewMonth + dir
    let y = viewMonthYear
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    setViewMonth(m); setViewMonthYear(y)
  }

  const yearOptions = useMemo(() => {
    const cy = now.getFullYear()
    return [cy - 2, cy - 1, cy, cy + 1]
  }, [now])

  const monthType = typeFor('month')
  const yearType = typeFor('year')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* attack-focus ranking — worst performers first */}
      <AvailabilityRankingBoard goal={goal} />

      {/* line + machine scope. ExportMenu (XLSX/print) staged for follow-up. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <Select
          label="Production Line"
          className="min-w-[200px]"
          value={line}
          onChange={setLine}
          options={PRODUCTION_LINES.map((l) => ({ label: l, value: l }))}
        />
        <Select
          label="Machine"
          className="min-w-[170px]"
          value={machine}
          onChange={setMachine}
          options={MACHINES.map((m) => ({ label: m, value: m }))}
        />
      </Box>

      <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>Availability</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {/* Today */}
        <CardShell title="Today">
          <TodayBars planned={today.planned} executed={today.executed} pct={today.pct} />
          <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', color: 'text.secondary' }}>
            {WEEKDAY_LONG[parseISO(todayIso).getDay()]} · {today.executed}h of {today.planned}h planned
          </Typography>
        </CardShell>

        {/* Yesterday */}
        <CardShell title="Yesterday">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AvailGauge value={yesterday.pct} goal={goal} />
            <Typography variant="caption" align="center" sx={{ mt: 1, color: 'text.secondary' }}>
              {yesterday.executed}h executed · {yesterday.planned}h planned
            </Typography>
          </Box>
        </CardShell>

        {/* Goal */}
        <CardShell title="Goal">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 2 }}>
            <Typography sx={{ fontSize: '3rem', fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>{goal}%</Typography>
            <Typography variant="body2" align="center" sx={{ mt: 1, color: 'text.secondary' }}>Monthly availability target</Typography>
            <Typography variant="caption" align="center" sx={{ mt: 0.5, color: 'text.disabled' }}>
              Shown as the dashed line on the Month &amp; Year charts.
            </Typography>
          </Box>
        </CardShell>

        {/* Month — spans 2 columns */}
        <CardShell
          title="Month"
          className="lg:col-span-2"
          toolbar={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChartTypeToggle value={monthType} onChange={(t) => setCard('month', t)} />
              <MonthStepper label={`${MONTH_LABELS[viewMonth]} ${viewMonthYear}`} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} />
            </Box>
          }
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' }, gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <AvailGauge value={monthSeries.overallPct} goal={goal} />
            </Box>
            <Box>
              <AvailChart series={monthSeries} type={monthType} goal={goal} height={180} />
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 0.5, color: 'text.disabled' }}>
                {seriesCaption(monthSeries, 'day')}
              </Typography>
            </Box>
          </Box>
        </CardShell>

        {/* per-machine Ranking */}
        <MachineRankingCard goal={goal} selectedMachine={machine} />

        {/* Year — spans all 3 columns */}
        <CardShell
          title="Year"
          className="lg:col-span-3"
          toolbar={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChartTypeToggle value={yearType} onChange={(t) => setCard('year', t)} />
              {/* No visible label: the DS Select puts its label above the
                  trigger, which would break the card header row. */}
              <Select
                className="min-w-[100px]"
                value={String(viewYear)}
                onChange={(v) => setViewYear(Number(v))}
                options={yearOptions.map((y) => ({ label: String(y), value: String(y) }))}
              />
            </Box>
          }
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' }, gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <AvailGauge value={yearSeries.overallPct} goal={goal} />
            </Box>
            <Box>
              <AvailChart series={yearSeries} type={yearType} goal={goal} height={200} />
              <Typography variant="caption" align="center" sx={{ display: 'block', mt: 0.5, color: 'text.disabled' }}>
                {seriesCaption(yearSeries, '')}
              </Typography>
            </Box>
          </Box>
        </CardShell>
      </Box>
    </Box>
  )
}
