'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import { Card } from '@/src/ds/components/Card'
import { Tabs, TabList, Tab } from '@/src/ds/components/Tabs'
import { Divider } from '@/src/ds/components/Divider'
import Typography from '@mui/material/Typography'
import FiltersV2, { type Period } from '../components/FiltersV2'
import CalendarV2 from '../components/CalendarV2'
import MetricsGridV2Mui from '../components/metrics/MetricsGridV2Mui'
import DetailsDrawerV2, { type DrawerData } from '../components/metrics/DetailsDrawerV2'
import RankingsV2 from '../components/machine/RankingsV2'
import InOperationV2 from '../components/machine/InOperationV2'
import MachineTabV2 from '../components/machine/MachineTabV2'
import { ALL_BATCHES, LIVE_BATCHES, MONTHS, isLiveMode, monthMetaFor } from '@/src/shared/data/mockData'
import {
  filterBatches, buildKpis, byDay, buildRankings,
  metricByDaySeries, metricByMachine, metricByRecipe,
  type Kpi, type DayRollup,
} from '@/src/shared/lib/compute'
import { useAvailabilitySettings, useAvailabilityPlan, useWorkingHolidays } from '@/src/shared/lib/availability'
import { useHolidays } from '@/src/shared/lib/holidays'
import { availabilityService } from '@/src/shared/data/availabilityData'

const CLOSED_DRAWER: DrawerData = { open: false, kind: 'day', title: '', subtitle: '', batches: [] }

// MUI-native Dashboard. Same data pipeline as v0/v1 (filter → KPIs → daily
// rollup); the presentation is rebuilt on MUI + MUI X Charts. Full feature set:
// edit-mode metric grid, calendar, rankings, in-operation strip, machine tab
// and the KPI/day details drawer.
export default function DashboardV2() {
  const live = isLiveMode()
  const [tab, setTab] = useState(0)
  // Live mode derives its defaults from the real datasets; mock keeps its exact
  // original defaults so /batch-book-v2 is unchanged.
  // Live defaults: every machine that has batches, and the month with the most
  // batches — so the dashboard opens on data instead of an empty filter.
  const [machines, setMachines] = useState<string[]>(() =>
    live ? Array.from(new Set(ALL_BATCHES.map((b) => b.machine))) : ['Zeta 10', 'Zeta 60'],
  )
  const [recipes, setRecipes] = useState<string[]>(() => (live ? [] : ['Dark Red']))
  const [period, setPeriod] = useState<Period>('monthly')
  const [monthKey, setMonthKey] = useState(() => {
    if (!live) return '2026-06'
    const counts = new Map<string, number>()
    for (const b of ALL_BATCHES) {
      const k = `${b.year}-${String(b.month + 1).padStart(2, '0')}`
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    let best = MONTHS[MONTHS.length - 1]?.key ?? '2026-06'
    let max = -1
    for (const [k, c] of counts) if (c > max) [max, best] = [c, k]
    return best
  })
  const [weekIdx, setWeekIdx] = useState(0)

  useEffect(() => { setWeekIdx(0) }, [monthKey])

  const monthMeta = monthMetaFor(monthKey)
  const monthIdx = MONTHS.findIndex((m) => m.key === monthKey)
  const prevMeta = monthIdx > 0 ? MONTHS[monthIdx - 1] : null

  const filtered = useMemo(() => filterBatches(ALL_BATCHES, { machines, recipes }), [machines, recipes])
  const monthBatches = useMemo(
    () => filtered.filter((b) => b.year === monthMeta.year && b.month === monthMeta.month),
    [filtered, monthMeta])
  const prevBatches = useMemo(
    () => (prevMeta ? filtered.filter((b) => b.year === prevMeta.year && b.month === prevMeta.month) : []),
    [filtered, prevMeta])

  // In live mode, metrics with no backend source render "—" (cooling, carbon, prod/idle).
  const kpis = useMemo(() => {
    const k = buildKpis(monthBatches, prevBatches)
    if (!live) return k
    const NA = new Set(['coolingEnergy', 'carbon', 'ratio'])
    return k.map((x) => (NA.has(x.key) ? { ...x, na: true } : x))
  }, [monthBatches, prevBatches, live])
  const dayMap = useMemo(() => byDay(monthBatches), [monthBatches])
  const rankings = useMemo(() => buildRankings(monthBatches), [monthBatches])

  const seriesByKey = useMemo(() => {
    const daysInMonth = new Date(monthMeta.year, monthMeta.month + 1, 0).getDate()
    const out: Record<string, number[]> = {}
    for (const k of kpis) out[k.key] = metricByDaySeries(monthBatches, k.key, daysInMonth).data
    return out
  }, [kpis, monthBatches, monthMeta])

  const [availSettings] = useAvailabilitySettings()
  const [availPlan] = useAvailabilityPlan()
  const availWh = useWorkingHolidays()
  const availHolidays = useHolidays(monthMeta.year)
  const availByDay = useMemo(() => {
    const ms = availabilityService.monthSeries(
      monthMeta.year, monthMeta.month, availPlan, availSettings, availHolidays.set, availWh.set)
    const map = new Map<number, number>()
    ms.pct.forEach((p, i) => map.set(i + 1, p))
    return map
  }, [monthMeta, availPlan, availSettings, availHolidays.set, availWh.set])

  const avgMass = useMemo(() => {
    const days = [...dayMap.values()]
    if (!days.length) return 0
    return days.reduce((a, d) => a + d.mass, 0) / days.length
  }, [dayMap])

  const clearFilters = () => { setMachines([]); setRecipes([]) }

  const hasMachine = machines.length > 0
  const hasData = hasMachine && monthBatches.length > 0

  const [drawer, setDrawer] = useState<DrawerData>(CLOSED_DRAWER)

  const openKpiDetails = (kpi: Kpi) => {
    const daysInMonth = new Date(monthMeta.year, monthMeta.month + 1, 0).getDate()
    setDrawer({
      open: true, kind: 'kpi', title: kpi.label,
      subtitle: `${monthMeta.label} · ${monthBatches.length} batches in scope`,
      batches: [], kpi,
      daily: metricByDaySeries(monthBatches, kpi.key, daysInMonth),
      byMachine: metricByMachine(monthBatches, kpi.key),
      byRecipe: metricByRecipe(monthBatches, kpi.key),
      richViz: true,
    })
  }
  const openDayDetails = (day: number, data: DayRollup) =>
    setDrawer({
      open: true, kind: 'day',
      title: `${monthMeta.label.split(' ')[0]} ${String(day).padStart(2, '0')}`,
      subtitle: `${data.count} ${data.count === 1 ? 'batch' : 'batches'} · ${(Math.round(data.mass * 10) / 10).toFixed(1)} ton`,
      batches: data.batches,
    })

  return (
    <Box sx={{ maxWidth: '75rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, p: 2.5 }}>
      <Tabs value={String(tab)} onValueChange={(v) => setTab(Number(v))} className="w-fit">
        <TabList aria-label="Dashboard view">
          <Tab value="0">Batches</Tab>
          <Tab value="1">Machine</Tab>
        </TabList>
      </Tabs>

      {tab === 0 ? (
        // overflow-visible so the filter dropdowns are not clipped by the card
        <Card className="overflow-visible">
          <FiltersV2
            machines={machines} recipes={recipes} setMachines={setMachines} setRecipes={setRecipes}
            period={period} setPeriod={setPeriod} monthKey={monthKey} setMonthKey={setMonthKey}
            year={monthMeta.year} month={monthMeta.month} weekIdx={weekIdx} setWeekIdx={setWeekIdx}
            onClear={clearFilters}
          />
          <Divider />
          {hasData ? (
            <Box sx={{ pt: 2 }}>
              <MetricsGridV2Mui kpis={kpis} series={seriesByKey} onDetails={openKpiDetails} />
              <CalendarV2
                year={monthMeta.year} month={monthMeta.month} dayMap={dayMap}
                avgMass={avgMass} onDetails={openDayDetails} availByDay={availByDay}
              />
              <RankingsV2 rankings={rankings} embedded />
            </Box>
          ) : (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.primary">
                {hasMachine ? 'No batches match these filters' : 'Select at least one machine'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {hasMachine
                  ? 'Try a different recipe, month or clear some filters.'
                  : 'Choose a machine in the filter above to load metrics and the calendar.'}
              </Typography>
            </Box>
          )}
        </Card>
      ) : (
        <Card>
          <MachineTabV2 />
        </Card>
      )}

      {hasData && tab === 0 && <InOperationV2 batches={LIVE_BATCHES} />}

      <DetailsDrawerV2 {...drawer} onClose={() => setDrawer((d) => ({ ...d, open: false }))} />
    </Box>
  )
}
