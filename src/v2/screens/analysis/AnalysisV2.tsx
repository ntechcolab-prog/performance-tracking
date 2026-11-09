'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { EChartsOption } from 'echarts'
import EChart from '@/src/v2/components/echarts/EChart'
import { Card } from '@/src/ds/components/Card'
import { Button } from '@/src/ds/components/Button'
import { IconButton } from '@/src/ds/components/IconButton'
import { Textfield } from '@/src/ds/components/Textfield'
import { Badge } from '@/src/ds/components/Badge'
import { Checkbox } from '@/src/ds/components/Checkbox'
import { Popover } from '@/src/ds/components/Popover'
import { Divider } from '@/src/ds/components/Divider'
import { SegmentedControl } from '@/src/ds/components/SegmentedControl'
import { Table, type Column, type RowId } from '@/src/ds/components/Table'

import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import SearchIcon from '@mui/icons-material/Search'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import DownloadIcon from '@mui/icons-material/Download'
import BarChartIcon from '@mui/icons-material/BarChart'

import { useLocalStorage } from '@/src/shared/lib/useLocalStorage'
import { ALL_BATCHES, type Batch } from '@/src/shared/data/mockData'
import {
  BATCH_METRICS,
  DEFAULT_METRIC_KEYS,
  formatMetric,
  extremesFor,
  type BatchMetricDef,
  type MetricStats,
} from '@/src/shared/lib/batchMetrics'
import { printElement } from '@/src/shared/lib/exportPdf'
import { exportCsv, exportXlsx, type Sheet, type Cell } from '@/src/shared/lib/exportData'

// v2 Analysis screen. Same business logic as the Tailwind v0/v1 version
// (saved-analyses list persisted per company + an editor that picks up to 8
// batches and compares them across metrics as tables / small-multiples charts).
// Widgets come from the Techco.lab DS, tables included (row click, disabled rows,
// pinned first column and hover shared with the charts).

const MAX = 8
const PRINT_ID = 'analysis-comparison-print-v2'
// Stable per-batch colors so a batch keeps its color across every mini-chart.
const BATCH_COLORS = ['#46aa9f', '#3b82f6', '#f19909', '#8b5cf6', '#16a34a', '#ef4444', '#06b6d4', '#ec4899']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const dateLabel = (b: Batch) => `${MONTH_SHORT[b.month]} ${b.day}, ${b.year}`
// Metric value formatted without its unit (the unit is shown once in the header).
const fmtNum = (m: BatchMetricDef, v: number) => formatMetric(m, v).replace(` ${m.unit}`, '')
const colorOf = (i: number) => BATCH_COLORS[i % BATCH_COLORS.length]

interface SavedAnalysis {
  id: string
  name: string
  batchIds: string[]
  createdAt: string // ISO
}

interface DraftAnalysis {
  id?: string
  name: string
  batchIds: string[]
}

// Batch picker columns (the checkbox column comes from the DS Table).
const PICKER_COLUMNS: Column<Batch>[] = [
  { key: 'id', header: 'Batch ID', render: (b) => <span className="font-medium">{b.id}</span> },
  { key: 'machine', header: 'Machine' },
  { key: 'recipe', header: 'Recipe', render: (b) => <span className="text-text-muted">{b.recipe}</span> },
  { key: 'month', id: 'date', header: 'Date', className: 'whitespace-nowrap', render: (b) => <span className="text-text-muted">{dateLabel(b)}</span> },
]

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AnalysisV2() {
  const [analyses, setAnalyses] = useLocalStorage<SavedAnalysis[]>('dr-analyses', [])
  const [editing, setEditing] = useState<DraftAnalysis | null>(null)

  // When the dashboard's "Generate Analysis" left a seed, open a fresh editor
  // pre-loaded with the batches that were filtered there, then clear the seed.
  const [seed, setSeed] = useLocalStorage<{ name: string; batchIds: string[] } | null>('dr-analysis-seed', null)
  useEffect(() => {
    if (seed) {
      setEditing({ name: seed.name, batchIds: seed.batchIds })
      setSeed(null)
    }
  }, [seed, setSeed])

  const openNew = () => setEditing({ name: '', batchIds: [] })
  const openExisting = (a: SavedAnalysis) => setEditing({ id: a.id, name: a.name, batchIds: a.batchIds })

  const onSave = (draft: DraftAnalysis) => {
    setAnalyses((prev) => {
      if (draft.id) {
        return prev.map((a) => (a.id === draft.id ? { ...a, name: draft.name, batchIds: draft.batchIds } : a))
      }
      const created: SavedAnalysis = {
        id: `a-${Date.now()}`,
        name: draft.name,
        batchIds: draft.batchIds,
        createdAt: new Date().toISOString(),
      }
      return [created, ...prev]
    })
    setEditing(null)
  }

  const remove = (id: string) => setAnalyses((prev) => prev.filter((a) => a.id !== id))

  const savedColumns: Column<SavedAnalysis>[] = [
    { key: 'name', header: 'Name', render: (a) => <span className="font-medium">{a.name}</span> },
    { key: 'batchIds', header: 'Batches', render: (a) => <span className="text-text-muted">{a.batchIds.length}</span> },
    { key: 'createdAt', header: 'Created', render: (a) => <span className="text-text-muted">{fmtDate(a.createdAt)}</span> },
    {
      key: 'id',
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (a) => (
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={`Delete ${a.name}`}
          onClick={() => remove(a.id)}
          className="text-text-muted hover:text-danger"
          icon={<DeleteOutlineIcon fontSize="small" />}
        />
      ),
    },
  ]

  if (editing) {
    return <AnalysisEditor initial={editing} onBack={() => setEditing(null)} onSave={onSave} />
  }

  return (
    <Box sx={{ maxWidth: '80rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <InsightsOutlinedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Analysis</Typography>
      </Box>

      <Card className="p-6">
        <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>Saved Analyses</Typography>
          <Button variant="primary" leadingIcon={<AddIcon fontSize="small" />} onClick={openNew}>New Analysis</Button>
        </Box>

        {analyses.length === 0 ? (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No analyses yet.</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              Create one to compare batches side by side.
            </Typography>
          </Box>
        ) : (
          <Table
            density="compact"
            columns={savedColumns}
            data={analyses}
            onRowClick={openExisting}
          />
        )}
      </Card>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function AnalysisEditor({
  initial, onBack, onSave,
}: { initial: DraftAnalysis; onBack: () => void; onSave: (a: DraftAnalysis) => void }) {
  const [name, setName] = useState(initial.name)
  const [selectedIds, setSelectedIds] = useState<string[]>(initial.batchIds)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [metricKeys, setMetricKeys] = useState<Set<string>>(new Set(DEFAULT_METRIC_KEYS))
  const [hoverBatch, setHoverBatch] = useState<string | null>(null)

  const visibleMetrics = useMemo(() => BATCH_METRICS.filter((m) => metricKeys.has(m.key)), [metricKeys])

  const selected = useMemo(
    () => selectedIds.map((id) => ALL_BATCHES.find((b) => b.id === id)).filter(Boolean) as Batch[],
    [selectedIds]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? ALL_BATCHES.filter((b) =>
          [b.id, b.machine, b.recipe, b.productionLine].some((v) => v.toLowerCase().includes(q))
        )
      : ALL_BATCHES
    return base.slice(0, 50)
  }, [query])

  const atMax = selectedIds.length >= MAX
  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX) return prev
      return [...prev, id]
    })

  const save = () => onSave({ id: initial.id, name: name.trim() || 'Untitled analysis', batchIds: selectedIds })

  return (
    <Box sx={{ maxWidth: '80rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
      {/* editor header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton aria-label="Back" onClick={onBack} variant="secondary" icon={<ChevronLeftIcon />} />
          <Textfield
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Analysis name"
            aria-label="Analysis name"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ExportMenu
            batches={selected}
            printId={PRINT_ID}
            filenameBase={`analysis-${(name || 'comparison').toLowerCase().replace(/\s+/g, '-')}`}
          />
          <Button variant="primary" leadingIcon={<SaveIcon fontSize="small" />} onClick={save} disabled={selectedIds.length === 0}>
            Save
          </Button>
        </Box>
      </Box>

      {/* batch picker */}
      <Card className="overflow-visible p-5">
        <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Select batches{' '}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
              ({selectedIds.length}/{MAX})
            </Box>
          </Typography>
          <div className="min-w-[260px]">
            <Textfield
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search id, machine, recipe …"
              aria-label="Search batches"
              leadingIcon={<SearchIcon fontSize="small" />}
            />
          </div>
        </Box>

        {/* selected chips */}
        {selected.length > 0 && (
          <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selected.map((b) => (
              <Badge key={b.id} variant="accent" className="pr-1">
                {`${b.id} · ${b.machine}`}
                <button
                  type="button"
                  aria-label={`Remove ${b.id}`}
                  onClick={() => toggle(b.id)}
                  className="inline-flex size-5 items-center justify-center rounded-round hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </button>
              </Badge>
            ))}
          </Box>
        )}

        {/* results */}
        <Table
          density="compact"
          stickyHeader
          className="max-h-60"
          columns={PICKER_COLUMNS}
          data={results}
          selectable
          hideSelectAll
          selectedIds={selectedIds}
          // The DS hands back the whole id list; route the one that changed
          // through `toggle` so the MAX cap and pick order stay the same.
          onSelectionChange={(ids) => {
            const next = new Set<RowId>(ids)
            const changed =
              ids.find((id) => !selectedIds.includes(String(id))) ??
              selectedIds.find((id) => !next.has(id))
            if (changed != null) toggle(String(changed))
          }}
          onRowClick={(b) => toggle(b.id)}
          isRowDisabled={(b) => atMax && !selectedIds.includes(b.id)}
        />
        {atMax && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
            Maximum of {MAX} batches reached — remove one to add another.
          </Typography>
        )}
      </Card>

      {/* comparison */}
      {selected.length < 2 ? (
        <Card className="border-dashed p-10 text-center">
          <BarChartIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Select at least 2 batches to compare.
          </Typography>
        </Card>
      ) : (
        <Card className="p-5">
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>Comparison</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MetricPicker selected={metricKeys} onChange={setMetricKeys} />
              <SegmentedControl
                size="sm"
                aria-label="Comparison view"
                value={view}
                onChange={(v) => v && setView(v as 'table' | 'chart')}
                options={[
                  { value: 'table', label: 'Table' },
                  { value: 'chart', label: 'Chart' },
                ]}
              />
            </Box>
          </Box>

          {visibleMetrics.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No metrics selected — pick metrics to compare.
            </Typography>
          ) : (
            <Box id={PRINT_ID}>
              {view === 'table' ? (
                <ComparisonTable batches={selected} metrics={visibleMetrics} hoverBatch={hoverBatch} onHoverBatch={setHoverBatch} />
              ) : (
                <ChartGrid batches={selected} metrics={visibleMetrics} hoverBatch={hoverBatch} onHoverBatch={setHoverBatch} />
              )}
            </Box>
          )}

          <Insights batches={selected} metrics={visibleMetrics} onHoverBatch={setHoverBatch} />
        </Card>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

function ComparisonTable({
  batches, metrics, hoverBatch, onHoverBatch,
}: {
  batches: Batch[]
  metrics: BatchMetricDef[]
  hoverBatch: string | null
  onHoverBatch: (id: string | null) => void
}) {
  // Batches read down the rows, metrics across the columns: adding metrics
  // grows the table sideways, so it scrolls horizontally with the Batch ID
  // column pinned to the left edge.
  const columns = metrics.map((m) => {
    const vals = batches.map((b) => m.value(b))
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    return { metric: m, vals, max, min, spread: max !== min }
  })
  // Hover is shared with the charts / insights: the DS Table reports the row
  // under the pointer and draws `highlightedKey` as highlighted.
  const rows = batches.map((b, row) => ({ id: b.id, b, row }))
  type Row = (typeof rows)[number]
  const tableColumns: Column<Row>[] = [
    {
      key: 'id',
      header: 'Batch ID',
      render: ({ b }) => (
        <>
          <span className="font-medium">{b.id}</span>
          {(b.startTime || b.endTime) && (
            <span className="mt-0.5 block text-[0.6875rem] font-normal tabular-nums text-text-subtle">
              {b.startTime || '—'} – {b.endTime || '—'}
            </span>
          )}
        </>
      ),
    },
    ...columns.map(({ metric: m, vals, max, min, spread }): Column<Row> => ({
      key: 'b',
      id: m.key,
      align: 'right',
      className: 'tabular-nums',
      header: (
        <>
          {m.label} <span className="font-normal text-text-subtle">({m.unit})</span>
        </>
      ),
      render: ({ b, row }) => {
        const isMax = spread && vals[row] === max
        const isMin = spread && vals[row] === min
        const st = m.stats ? m.stats(b) : null
        return st ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25, lineHeight: 1.2 }}>
            {([
              ['Max', st.max, false] as const,
              ['Avg', st.avg, true] as const,
              ['Min', st.min, false] as const,
            ]).map(([lbl, val, isAvg]) => (
              <Box
                component="span"
                key={lbl}
                sx={{
                  fontWeight: isAvg && (isMax || isMin) ? 600 : 400,
                  color: isAvg && isMax ? 'success.main' : isAvg && isMin ? 'error.main' : 'inherit',
                }}
              >
                <Box component="span" sx={{ mr: 0.5, fontSize: '0.625rem', textTransform: 'uppercase', color: 'text.disabled' }}>
                  {lbl}
                </Box>
                {fmtNum(m, val)}
                {isAvg && isMax && <Box component="span" sx={{ ml: 0.5, fontSize: '0.625rem' }}>▲</Box>}
                {isAvg && isMin && <Box component="span" sx={{ ml: 0.5, fontSize: '0.625rem' }}>▼</Box>}
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            component="span"
            sx={{
              fontWeight: isMax || isMin ? 600 : 400,
              color: isMax ? 'success.main' : isMin ? 'error.main' : 'inherit',
            }}
          >
            {fmtNum(m, vals[row])}
            {isMax && <Box component="span" sx={{ ml: 0.5, fontSize: '0.625rem' }}>▲</Box>}
            {isMin && <Box component="span" sx={{ ml: 0.5, fontSize: '0.625rem' }}>▼</Box>}
          </Box>
        )
      },
    })),
  ]

  return (
    <div>
      <Table
        density="compact"
        stickyFirstColumn
        className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
        columns={tableColumns}
        data={rows}
        onRowHover={(r) => onHoverBatch(r ? r.id : null)}
        highlightedKey={hoverBatch}
      />
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
        <Box component="span" sx={{ color: 'success.main' }}>▲</Box> highest ·{' '}
        <Box component="span" sx={{ color: 'error.main' }}>▼</Box> lowest per metric across the selected batches.
        Sensor parameters report max / min / avg per batch (compared by average).
      </Typography>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small-multiples chart grid — one mini bar chart per metric.
// ---------------------------------------------------------------------------

function ChartGrid({
  batches, metrics, hoverBatch, onHoverBatch,
}: {
  batches: Batch[]
  metrics: BatchMetricDef[]
  hoverBatch: string | null
  onHoverBatch: (id: string | null) => void
}) {
  const ids = batches.map((b) => b.id)
  // Stable ordinal color map keyed by batch id — the same color the batch shows
  // in the legend and in every small-multiple chart below.
  const colorById = useMemo(() => {
    const map: Record<string, string> = {}
    batches.forEach((b, i) => { map[b.id] = colorOf(i) })
    return map
  }, [batches])

  return (
    <Box sx={{ py: 0.5 }}>
      {/* batch color legend */}
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {batches.map((b) => (
          <Box
            key={b.id}
            onMouseEnter={() => onHoverBatch(b.id)}
            onMouseLeave={() => onHoverBatch(null)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'default',
              opacity: hoverBatch && hoverBatch !== b.id ? 0.4 : 1, transition: 'opacity 0.15s',
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: colorById[b.id] }} />
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>{b.id}</Typography>
            <Typography variant="caption" color="text.secondary">{b.machine}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, columnGap: 3, rowGap: 2.5 }}>
        {metrics.map((m) => (
          <Box key={m.key} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default', p: 1.5 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 500, color: 'text.primary' }}>
              {m.label} <Box component="span" sx={{ color: 'text.disabled' }}>({m.unit})</Box>
            </Typography>
            <MetricBarChart metric={m} batches={batches} ids={ids} colorById={colorById} />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// One small-multiple: a bar per selected batch, each colored by its stable color.
function MetricBarChart({
  metric, batches, ids, colorById,
}: {
  metric: BatchMetricDef
  batches: Batch[]
  ids: string[]
  colorById: Record<string, string>
}) {
  const option = useMemo<EChartsOption>(() => {
    // Per-item color via itemStyle keeps each bar on its batch's stable color.
    const data = batches.map((b) => ({
      value: Math.round(metric.value(b) * 100) / 100,
      itemStyle: { color: colorById[b.id], borderRadius: [3, 3, 0, 0] as [number, number, number, number] },
    }))
    return {
      grid: { left: 8, right: 8, top: 8, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const params = p as { name: string; value: number }
          return `${params.name}<br/>${fmtNum(metric, params.value)} ${metric.unit}`
        },
      },
      xAxis: { type: 'category', data: ids },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data, barMaxWidth: 40 }],
    }
  }, [metric, batches, ids, colorById])

  return <EChart option={option} height={180} />
}

// ---------------------------------------------------------------------------
// Insights / highlights
// ---------------------------------------------------------------------------

function Insights({
  batches, metrics, onHoverBatch,
}: {
  batches: Batch[]
  metrics: BatchMetricDef[]
  onHoverBatch: (id: string | null) => void
}) {
  const BatchTag = ({ id }: { id: string }) => (
    <Box
      component="span"
      onMouseEnter={() => onHoverBatch(id)}
      onMouseLeave={() => onHoverBatch(null)}
      sx={{ cursor: 'default', borderRadius: 0.5, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
    >
      {id}
    </Box>
  )
  return (
    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
        Highlights
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {metrics.map((m) => {
          const ext = extremesFor(m, batches)
          if (!ext) return null
          return (
            <Box key={m.key} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default', p: 1.5 }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, textTransform: 'uppercase', color: 'text.secondary' }}>
                {m.label}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.primary' }}>
                <Box component="span" sx={{ color: 'success.main' }}>High</Box> <BatchTag id={ext.maxId} /> ·{' '}
                <Box component="span" sx={{ fontWeight: 600 }}>{formatMetric(m, ext.maxValue)}</Box>
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.primary' }}>
                <Box component="span" sx={{ color: 'error.main' }}>Low</Box> <BatchTag id={ext.minId} /> ·{' '}
                <Box component="span" sx={{ fontWeight: 600 }}>{formatMetric(m, ext.minValue)}</Box>
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Metric picker — grouped checkbox menu
// ---------------------------------------------------------------------------

function MetricPicker({ selected, onChange }: { selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, BatchMetricDef[]>()
    for (const m of BATCH_METRICS) {
      const arr = map.get(m.group) ?? []
      arr.push(m)
      map.set(m.group, arr)
    }
    return [...map.entries()]
  }, [])

  const toggle = (key: string) => {
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange(next)
  }
  const toggleGroup = (metrics: BatchMetricDef[]) => {
    const allOn = metrics.every((m) => selected.has(m.key))
    const next = new Set(selected)
    metrics.forEach((m) => (allOn ? next.delete(m.key) : next.add(m.key)))
    onChange(next)
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="end"
      aria-label="Metrics"
      className="max-h-[26rem] w-72 overflow-auto"
      trigger={
        <Button
          variant="secondary"
          size="sm"
          className="text-text-muted"
        >
          Metrics ({selected.size})
          <KeyboardArrowDownIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </Button>
      }
    >
        {groups.map(([group, metrics], gi) => {
          const allOn = metrics.every((m) => selected.has(m.key))
          return (
            <Box key={group} sx={{ mb: gi === groups.length - 1 ? 0 : 1 }}>
              <Box
                onClick={() => toggleGroup(metrics)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                  mb: 0.5, fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase',
                  color: 'text.disabled', '&:hover': { color: 'text.primary' },
                }}
              >
                <span>{group}</span>
                <Box component="span" sx={{ color: 'primary.main' }}>{allOn ? 'Clear' : 'All'}</Box>
              </Box>
              <div className="flex flex-col gap-1.5 py-0.5">
                {metrics.map((m) => (
                  <Checkbox
                    key={m.key}
                    label={`${m.label} (${m.unit})`}
                    checked={selected.has(m.key)}
                    onChange={() => toggle(m.key)}
                    className="w-full"
                  />
                ))}
              </div>
            </Box>
          )
        })}
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Export menu — PDF / CSV / Excel with per-metric / per-batch pickers.
// Reuses printElement + exportCsv/exportXlsx; sheet mirrors the comparison table.
// ---------------------------------------------------------------------------

function ExportMenu({ batches, printId, filenameBase }: { batches: Batch[]; printId: string; filenameBase: string }) {
  const [open, setOpen] = useState(false)
  const [metricKeys, setMetricKeys] = useState<Set<string>>(new Set(BATCH_METRICS.map((m) => m.key)))
  const [batchIds, setBatchIds] = useState<Set<string>>(new Set(batches.map((b) => b.id)))

  // Re-sync the batch selection to the current comparison set when it changes.
  const idsKey = batches.map((b) => b.id).join(',')
  useEffect(() => {
    setBatchIds(new Set(idsKey ? idsKey.split(',') : []))
  }, [idsKey])

  const metrics = BATCH_METRICS.filter((m) => metricKeys.has(m.key))
  const picked = batches.filter((b) => batchIds.has(b.id))
  const ready = metrics.length > 0 && picked.length > 0

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    setter(next)
  }

  const buildSheets = (): Sheet[] => {
    const header: Cell[] = ['Metric', 'Unit', ...picked.map((b) => b.id)]
    const rows: Cell[][] = metrics.flatMap((m) => {
      if (m.stats) {
        const statRow = (suffix: string, sel: (s: MetricStats) => number): Cell[] => [
          `${m.label} (${suffix})`,
          m.unit,
          ...picked.map((b) => Number(sel(m.stats!(b)).toFixed(3))),
        ]
        return [
          statRow('max', (s) => s.max),
          statRow('avg', (s) => s.avg),
          statRow('min', (s) => s.min),
        ]
      }
      return [[m.label, m.unit, ...picked.map((b) => Number(m.value(b).toFixed(3)))]]
    })
    return [{ name: 'Comparison', rows: [header, ...rows] }]
  }

  const run = (fn: () => void | Promise<void>) => {
    Promise.resolve(fn()).catch(() => {})
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="end"
      aria-label="Export"
      className="w-72"
      trigger={
        <Button
          variant="secondary"
          size="md"
          leadingIcon={<DownloadIcon fontSize="small" />}
          className="no-print"
        >
          Export
          <KeyboardArrowDownIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </Button>
      }
    >
        <ExportGroup title="Metrics">
          {BATCH_METRICS.map((m) => (
            <ExportCheckRow
              key={m.key}
              label={`${m.label} (${m.unit})`}
              checked={metricKeys.has(m.key)}
              onChange={() => toggle(metricKeys, m.key, setMetricKeys)}
            />
          ))}
        </ExportGroup>
        <ExportGroup title="Batches">
          {batches.map((b) => (
            <ExportCheckRow
              key={b.id}
              label={`${b.id} · ${b.machine}`}
              checked={batchIds.has(b.id)}
              onChange={() => toggle(batchIds, b.id, setBatchIds)}
            />
          ))}
        </ExportGroup>

        <Divider className="my-2" />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" disabled={!ready}
            onClick={() => run(() => printElement(printId, 'Analysis · Comparison'))}>PDF</Button>
          <Button size="sm" variant="secondary" className="flex-1" disabled={!ready}
            onClick={() => run(() => exportCsv(filenameBase, buildSheets()[0]))}>CSV</Button>
          <Button size="sm" variant="secondary" className="flex-1" disabled={!ready}
            onClick={() => run(() => exportXlsx(filenameBase, buildSheets()))}>Excel</Button>
        </div>
    </Popover>
  )
}

function ExportGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', color: 'text.disabled', fontSize: '0.625rem' }}>
        {title}
      </Typography>
      <Box sx={{ maxHeight: 160, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>{children}</Box>
    </Box>
  )
}

function ExportCheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <Checkbox label={label} checked={checked} onChange={onChange} className="w-full py-0.5" />
}
