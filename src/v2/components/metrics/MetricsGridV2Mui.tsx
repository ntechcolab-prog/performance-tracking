'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '@/src/ds/components/Card'
import { Button } from '@/src/ds/components/Button'
import { IconButton } from '@/src/ds/components/IconButton'
import { Menu } from '@/src/ds/components/Menu'
import { Popover } from '@/src/ds/components/Popover'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { cn } from '@/src/ds/helpers/cn'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined'
import BarChartIcon from '@mui/icons-material/BarChartOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChartOutlined'
import StackedLineChartIcon from '@mui/icons-material/StackedLineChartOutlined'
import ArrowUpIcon from '@mui/icons-material/ArrowDropUp'
import ArrowDownIcon from '@mui/icons-material/ArrowDropDown'
import EChart from '@/src/v2/components/echarts/EChart'
import { sparkOption } from '@/src/v2/components/KpiCardV2'
import { formatValue, type Kpi } from '@/src/shared/lib/compute'
import { metaFor, withAlpha, VIZ, VIZ_CAPTION, METRIC_STYLE_KEY, type MetricStyleMap } from '@/src/shared/viz/metricViz'
import { useLocalStorage } from '@/src/shared/lib/useLocalStorage'
import type { ChartType } from '@/src/shared/lib/availability'

// MUI-native rebuild of MetricsGridV2 (Tailwind original in src/components).
// Reuses the same compute + metricViz language (VIZ/metaFor/withAlpha/captions)
// and the SAME localStorage-backed style map (METRIC_STYLE_KEY) as v0/v1, so the
// chart-style a user picks here carries over to the details drawer. Edit mode
// reproduces the original: drag-to-reorder (native HTML5 DnD), remove (−) /
// "+ Add" hidden metrics, and a per-card Auto/Bars/Line/Area picker.

const STYLE_OPTIONS: { key: ChartType | ''; Icon: typeof BarChartIcon; label: string }[] = [
  { key: '', Icon: AutoAwesomeIcon, label: 'Auto' },
  { key: 'bar', Icon: BarChartIcon, label: 'Bars' },
  { key: 'line', Icon: ShowChartIcon, label: 'Line' },
  { key: 'area', Icon: StackedLineChartIcon, label: 'Area' },
]

interface MetricsGridV2MuiProps {
  kpis: Kpi[]
  // Per-metric daily series (keyed by kpi.key) for the card visualizations.
  series?: Record<string, number[]>
  onDetails?: (kpi: Kpi) => void
}

interface Snapshot {
  hidden: Set<string>
  order: string[]
}

// Metrics hidden by default — no real data source yet, but still re-addable via "+ Add".
const DEFAULT_HIDDEN = ['coolingEnergy']

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
  gap: 1.5,
} as const

export default function MetricsGridV2Mui({ kpis, series, onDetails }: MetricsGridV2MuiProps) {
  const [editing, setEditing] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(DEFAULT_HIDDEN))
  const [order, setOrder] = useState<string[]>(() => kpis.map((k) => k.key))
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [styleMap, setStyleMap] = useLocalStorage<MetricStyleMap>(METRIC_STYLE_KEY, {})

  const setStyle = (key: string, style: ChartType | '') =>
    setStyleMap((m) => ({ ...m, [key]: style }))

  const enterEdit = () => {
    setSnapshot({ hidden: new Set(hidden), order: [...order] })
    setEditing(true)
  }

  const done = () => {
    setEditing(false)
    setConfirmOpen(false)
    setSnapshot(null)
  }

  const dirty =
    !!snapshot &&
    (snapshot.order.join() !== order.join() ||
      snapshot.hidden.size !== hidden.size ||
      [...hidden].some((k) => !snapshot.hidden.has(k)))

  const cancel = () => {
    if (dirty) {
      setConfirmOpen(true)
      return
    }
    done()
  }

  const discard = () => {
    if (snapshot) {
      setHidden(new Set(snapshot.hidden))
      setOrder([...snapshot.order])
    }
    done()
  }

  // Keep the order list in sync if the set of metric keys ever changes.
  useEffect(() => {
    setOrder((prev) => {
      const known = new Set(prev)
      const extras = kpis.map((k) => k.key).filter((k) => !known.has(k))
      const pruned = prev.filter((k) => kpis.some((kp) => kp.key === k))
      return extras.length || pruned.length !== prev.length ? [...pruned, ...extras] : prev
    })
  }, [kpis])

  const byKey = useMemo(() => new Map(kpis.map((k) => [k.key, k])), [kpis])
  const orderedVisible = order
    .filter((key) => byKey.has(key) && !hidden.has(key))
    .map((key) => byKey.get(key)!)
  const hiddenKpis = kpis.filter((k) => hidden.has(k.key))

  const hide = (key: string) => setHidden((s) => new Set(s).add(key))
  const show = (key: string) =>
    setHidden((s) => {
      const n = new Set(s)
      n.delete(key)
      return n
    })

  const reorder = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return
    setOrder((prev) => {
      const from = prev.indexOf(dragKey)
      const to = prev.indexOf(targetKey)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, dragKey)
      return next
    })
  }

  return (
    <Box component="section" sx={{ px: 3, pb: 1 }}>
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Metrics
        </Typography>
        {editing ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Opening is driven by `cancel` (only when dirty); the popover itself
                may only close. */}
            <Popover
              open={confirmOpen}
              onOpenChange={(o) => { if (!o) setConfirmOpen(false) }}
              side="bottom"
              align="end"
              aria-label="Discard changes?"
              className="w-64 p-4"
              trigger={
                <Button size="sm" variant="ghost" onClick={cancel} className="text-text-muted">
                  Cancel
                </Button>
              }
            >
              <p className="text-sm font-semibold text-text">Discard changes?</p>
              <p className="mt-1 text-xs text-text-muted">
                Your layout changes (removed, added or reordered metrics) won&apos;t be saved.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)} className="text-text-muted">
                  Keep editing
                </Button>
                <Button size="sm" variant="danger" onClick={discard}>
                  Discard
                </Button>
              </div>
            </Popover>
            <Button size="sm" variant="primary" onClick={done}>
              Done
            </Button>
          </Box>
        ) : (
          <Button size="sm" variant="ghost" onClick={enterEdit} className="text-accent">
            Edit
          </Button>
        )}
      </Box>

      {editing && (
        <Box
          sx={{
            mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
            borderRadius: 1.5, bgcolor: 'background.default', px: 1.5, py: 1,
            color: 'text.secondary', fontSize: '0.75rem',
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
          <span>
            Drag cards to reorder · tap{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'error.main' }}>−</Box> to remove · use{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>+ Add</Box> to bring metrics back
          </span>
        </Box>
      )}

      <Box sx={GRID_SX}>
        {orderedVisible.map((k, i) => (
          <EditableKpiCard
            key={k.key}
            kpi={k}
            series={series?.[k.key] ?? []}
            editing={editing}
            jiggleAlt={i % 2 === 1}
            dragging={dragKey === k.key}
            style={styleMap[k.key] ?? ''}
            onStyle={(s) => setStyle(k.key, s)}
            onRemove={() => hide(k.key)}
            onDetails={() => onDetails?.(k)}
            onDragStart={() => setDragKey(k.key)}
            onDragEnter={() => reorder(k.key)}
            onDragEnd={() => setDragKey(null)}
          />
        ))}
        {editing && <AddCard hidden={hiddenKpis} onAdd={show} />}
      </Box>
    </Box>
  )
}

// Maps the metric's default viz (or the user override) onto a MUI SparkLine.
// Matches KpiCardV2's simplification: column → bars, area → filled line, every
// other kind (gauge/donut/compare/bullet) → plain line trend.
function sparkKind(kpiKey: string, override: ChartType | '') {
  if (override === 'bar') return { plotType: 'bar' as const, area: false }
  if (override === 'line') return { plotType: 'line' as const, area: false }
  if (override === 'area') return { plotType: 'line' as const, area: true }
  const kind = VIZ[kpiKey] ?? 'area'
  return { plotType: kind === 'column' ? ('bar' as const) : ('line' as const), area: kind === 'area' }
}

interface EditableKpiCardProps {
  kpi: Kpi
  series: number[]
  editing: boolean
  jiggleAlt: boolean
  dragging: boolean
  style: ChartType | ''
  onStyle: (s: ChartType | '') => void
  onRemove: () => void
  onDetails: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}

function EditableKpiCard({
  kpi, series, editing, jiggleAlt, dragging, style,
  onStyle, onRemove, onDetails, onDragStart, onDragEnter, onDragEnd,
}: EditableKpiCardProps) {
  const up = kpi.delta >= 0
  const { accent } = metaFor(kpi.key)
  const { plotType, area } = sparkKind(kpi.key, style)

  const jiggle = editing && !dragging
    ? { animation: `${jiggleAlt ? 'kpiJiggleAlt' : 'kpiJiggle'} 0.34s ease-in-out infinite` }
    : {}

  return (
    <Box
      draggable={editing}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => editing && e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => e.preventDefault()}
      sx={{
        position: 'relative',
        transition: 'opacity 0.15s',
        opacity: dragging ? 0.4 : 1,
        cursor: editing ? 'grab' : 'default',
        '&:active': editing ? { cursor: 'grabbing' } : undefined,
        '@keyframes kpiJiggle': {
          '0%,100%': { transform: 'rotate(-0.6deg)' },
          '50%': { transform: 'rotate(0.6deg)' },
        },
        '@keyframes kpiJiggleAlt': {
          '0%,100%': { transform: 'rotate(0.6deg)' },
          '50%': { transform: 'rotate(-0.6deg)' },
        },
        ...jiggle,
      }}
    >
      {editing && (
        <IconButton
          variant="danger"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove ${kpi.label}`}
          icon={<RemoveIcon sx={{ fontSize: 16 }} />}
          className="absolute -left-2.5 -top-2.5 z-10 size-6 rounded-round shadow-md transition-transform hover:scale-110"
        />
      )}

      <Card className={cn('flex h-full flex-col p-4', dragging && 'border-accent')}>
        {/* row 1 — icon + title, delta on the right */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: 1.25, display: 'grid', placeItems: 'center',
              bgcolor: withAlpha(accent, 0.12), color: accent }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent }} />
            </Box>
            <Typography variant="overline" noWrap sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.2 }}>
              {kpi.label}
            </Typography>
          </Box>
          {!kpi.na && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, fontWeight: 600, fontSize: '0.75rem',
              color: up ? 'success.main' : 'error.main' }}>
              {up ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
              {up ? '+' : ''}{Math.round(kpi.delta)}%
            </Box>
          )}
        </Box>

        {/* row 2 — value on the left, viz on the right */}
        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '2fr 3fr', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 0.5, lineHeight: 1 }}>
              <Typography component="span" sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>
                {kpi.na ? '—' : formatValue(kpi.value, kpi.fmt)}
              </Typography>
              <Typography component="span" variant="caption" color="text.secondary">{kpi.na ? '' : kpi.unit}</Typography>
            </Box>
          </Box>
          <Box sx={{ height: 64, overflow: 'hidden' }}>
            {series.length > 0 && (
              <EChart option={sparkOption(series, accent, plotType, area)} height={64} />
            )}
          </Box>
        </Box>

        {/* edit mode — chart-style picker */}
        {editing && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, borderRadius: 1.5, bgcolor: 'background.default', p: 0.5 }}>
            {STYLE_OPTIONS.map(({ key, Icon, label }) => {
              const active = (style || '') === key
              return (
                <Tooltip key={label} content={label}>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={label}
                    aria-pressed={active}
                    onClick={(e) => { e.stopPropagation(); onStyle(key) }}
                    icon={<Icon sx={{ fontSize: 16 }} />}
                    className={cn(
                      'h-7 w-auto flex-1 rounded-sm',
                      active
                        ? 'bg-surface-raised text-accent shadow-sm hover:bg-surface-raised'
                        : 'text-text-muted hover:text-text',
                    )}
                  />
                </Tooltip>
              )
            })}
          </Box>
        )}

        {/* footer — caption + details */}
        <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', fontSize: '0.625rem', fontWeight: 500 }}>
            {VIZ_CAPTION[kpi.key] ?? 'vs last month'}
          </Typography>
          {!editing && (
            <Button size="sm" variant="ghost" onClick={onDetails} className="h-7 px-1.5 text-accent">Details</Button>
          )}
        </Box>
      </Card>
    </Box>
  )
}

function AddCard({ hidden, onAdd }: { hidden: Kpi[]; onAdd: (key: string) => void }) {
  // Stays open while metrics are added; picking the last hidden one closes it.
  const items = hidden.length === 0
    ? [{ label: 'All metrics are shown.', disabled: true }]
    : hidden.map((k) => ({ label: k.label, onSelect: () => onAdd(k.key), closeOnSelect: hidden.length === 1 }))

  return (
    <Menu
      items={items}
      closeOnSelect={false}
      className="max-h-60 min-w-[180px] overflow-y-auto"
      trigger={
        <button
          type="button"
          className={cn(
            'flex min-h-[6.5rem] w-full cursor-pointer flex-col items-center justify-center gap-1',
            'rounded-card border-2 border-dashed border-border-strong bg-transparent text-text-muted',
            'transition-colors hover:border-accent hover:text-accent',
          )}
        >
          <AddIcon />
          <span className="text-sm font-medium">Add</span>
        </button>
      }
    />
  )
}
