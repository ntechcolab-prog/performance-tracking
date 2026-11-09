'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Drawer } from '@/src/ds/components/Drawer'
import { Badge } from '@/src/ds/components/Badge'
import ArrowUpIcon from '@mui/icons-material/ArrowDropUp'
import ArrowDownIcon from '@mui/icons-material/ArrowDropDown'
import type { EChartsOption } from 'echarts'
import EChart, { chartPalette } from '@/src/v2/components/echarts/EChart'
import { formatValue, type Kpi, type RankItem } from '@/src/shared/lib/compute'
import type { Batch } from '@/src/shared/data/mockData'
import { VIZ, metaFor, withAlpha, METRIC_STYLE_KEY, type MetricStyleMap } from '@/src/shared/viz/metricViz'
import { useLocalStorage } from '@/src/shared/lib/useLocalStorage'

// MUI-native rebuild of DetailsDrawer (Tailwind original in src/components).
// Same DrawerData contract as v0/v1 so the orchestrator can feed it unchanged.
// KPI mode: headline + daily trend (line/bar, linear — no smoothing) + per-machine
// and per-recipe horizontal-bar breakdowns, all on ECharts via the IRIS EChart
// wrapper. Day mode: batch list. Chart style honors the METRIC_STYLE_KEY override.

export type DrawerData = {
  open: boolean
  kind: 'kpi' | 'day'
  title: string
  subtitle: string
  // day mode
  batches: Batch[]
  // kpi mode
  kpi?: Kpi
  daily?: { labels: string[]; data: number[] }
  byMachine?: RankItem[]
  byRecipe?: RankItem[]
  // when true, the trend uses the same viz style as the V2 metric card
  richViz?: boolean
}

type DetailsDrawerV2Props = DrawerData & { onClose: () => void }

export default function DetailsDrawerV2({
  open, kind, title, subtitle, batches, kpi, daily, byMachine, byRecipe, richViz, onClose,
}: DetailsDrawerV2Props) {
  return (
    // DS Drawer header only takes a string title (it renders its own close
    // button), so the subtitle opens the body instead.
    <Drawer side="right" open={open} onClose={onClose} title={title} className="max-w-[30rem]">
      {subtitle && <p className="-mt-1 mb-4 text-sm text-text-muted">{subtitle}</p>}
      {kind === 'kpi'
        ? <KpiDetail kpi={kpi} daily={daily} byMachine={byMachine} byRecipe={byRecipe} richViz={richViz} />
        : <BatchList batches={batches} />}
    </Drawer>
  )
}

function KpiDetail({
  kpi, daily, byMachine, byRecipe, richViz,
}: {
  kpi?: Kpi
  daily?: { labels: string[]; data: number[] }
  byMachine?: RankItem[]
  byRecipe?: RankItem[]
  richViz?: boolean
}) {
  // The chart style chosen on the metric card carries over to the drawer.
  const [styleMap] = useLocalStorage<MetricStyleMap>(METRIC_STYLE_KEY, {})
  if (!kpi) return null
  const override = styleMap[kpi.key] || undefined
  const up = kpi.delta >= 0
  const accent = metaFor(kpi.key).accent
  const kind = VIZ[kpi.key]
  // Time-series viz read as a trend; the summary viz (gauge/donut/...) doesn't.
  const trendTitle =
    override || !richViz || kind === 'area' || kind === 'column' ? 'Daily trend' : 'Summary'
  // Render the daily series as bars for column metrics / bar override, else line.
  const asBars = override === 'bar' || (!override && kind === 'column')
  const asArea = override === 'area' || (!override && kind === 'area')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* headline value */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography component="span" sx={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>
            {formatValue(kpi.value, kpi.fmt)}
          </Typography>
          <Typography component="span" variant="body2" color="text.secondary">{kpi.unit}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontWeight: 600, fontSize: '0.875rem',
          color: up ? 'success.main' : 'error.main' }}>
          {up ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
          {up ? '+' : ''}{Math.round(kpi.delta)}% vs prev. month
        </Box>
      </Box>

      {daily && daily.data.length > 0 && (
        <Section title={trendTitle}>
          <TrendChart
            labels={daily.labels}
            data={daily.data}
            accent={accent}
            unit={kpi.unit}
            asBars={asBars}
            asArea={asArea}
          />
        </Section>
      )}

      {byMachine && byMachine.length > 0 && (
        <Section title="By machine">
          <RankBars data={byMachine} unit={kpi.unit} />
        </Section>
      )}

      {byRecipe && byRecipe.length > 0 && (
        <Section title="By recipe">
          <RankBars data={byRecipe} unit={kpi.unit} />
        </Section>
      )}
    </Box>
  )
}

// Daily trend — line (optionally area-filled) or bars, always linear (no smoothing).
function TrendChart({
  labels, data, accent, unit, asBars, asArea,
}: {
  labels: string[]
  data: number[]
  accent: string
  unit: string
  asBars: boolean
  asArea: boolean
}) {
  const series: EChartsOption['series'] = asBars
    ? [{
        type: 'bar',
        data,
        itemStyle: { color: accent, borderRadius: [2, 2, 0, 0] },
      }]
    : [{
        type: 'line',
        data,
        smooth: false,
        showSymbol: false,
        lineStyle: { color: accent, width: 2 },
        itemStyle: { color: accent },
        ...(asArea ? { areaStyle: { color: withAlpha(accent, 0.16) } } : {}),
      }]

  const option: EChartsOption = {
    grid: { left: 8, right: 8, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (v == null ? '' : `${v} ${unit}`),
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: asBars,
    },
    yAxis: { type: 'value' },
    series,
  }
  return <EChart option={option} height={220} />
}

// Horizontal ranking bars — one colored bar per category (machine / recipe).
function RankBars({ data, unit }: { data: RankItem[]; unit: string }) {
  // Category axis renders bottom-up; `inverse` keeps the first (top-ranked)
  // item at the top, matching the previous horizontal layout.
  const barData = data.map((d, i) => ({
    value: d.value,
    itemStyle: { color: chartPalette[i % chartPalette.length] },
  }))
  const height = Math.max(120, data.length * 44 + 40)
  const option: EChartsOption = {
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => (v == null ? '' : `${v} ${unit}`),
    },
    xAxis: { type: 'value', min: 0 },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.label),
      inverse: true,
    },
    series: [{ type: 'bar', data: barData, barMaxWidth: 22, itemStyle: { borderRadius: [0, 3, 3, 0] } }],
  }
  return <EChart option={option} height={height} />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ mb: 1.5, display: 'block', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.04em', color: 'text.secondary', fontSize: '0.6875rem' }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function BatchList({ batches }: { batches: Batch[] }) {
  if (batches.length === 0) {
    return <Typography variant="body2" sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>No batches for this selection.</Typography>
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {batches.map((b) => (
        <Box key={b.id} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>Batch {b.id}</Typography>
            <StatusPill status={b.status} />
          </Box>
          <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>{b.recipe} · {b.machine}</Typography>
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            <Stat label="Mass" value={`${b.mass} ton`} />
            <Stat label="Energy" value={`${b.energy} kWh`} />
            <Stat label="Grinding" value={`${b.grindMin} min`} />
            <Stat label="Setup" value={`${b.setupMin} min`} />
            <Stat label="Idle" value={`${b.idleMin} min`} />
            <Stat label="CO₂" value={`${b.co2}`} />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 500, color: 'text.primary' }}>{value}</Typography>
    </Box>
  )
}

function StatusPill({ status }: { status: string }) {
  const variant: 'danger' | 'accent' | 'neutral' =
    status === 'Cancelled' ? 'danger' : status.startsWith('Completed') ? 'accent' : 'neutral'
  return <Badge variant={variant} size="sm">{status}</Badge>
}
