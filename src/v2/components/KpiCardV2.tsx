'use client'

import { Card } from '@/src/ds/components/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Button } from '@/src/ds/components/Button'
import ArrowUpIcon from '@mui/icons-material/ArrowDropUp'
import ArrowDownIcon from '@mui/icons-material/ArrowDropDown'
import type { EChartsOption } from 'echarts'
import EChart from '@/src/v2/components/echarts/EChart'
import { formatValue, type Kpi } from '@/src/shared/lib/compute'
import { metaFor, withAlpha, VIZ, VIZ_CAPTION } from '@/src/shared/viz/metricViz'

// MUI-native KPI card. Reuses the same compute/metricViz logic as v0/v1; the
// hand-rolled SVG sparkline is replaced by a tiny ECharts sparkline (line/bar,
// area fill for the area kind), colored by the metric accent. Chrome is stripped
// (no axes/grid/tooltip). Lines are NOT smoothed — production/manufacturing
// series read as straight segments (matches the product's charting rule).

// Builds a minimal ECharts sparkline: no axes, no grid, no tooltip. `plotType`
// is 'line' or 'bar'; `area` adds a soft accent fill under a line.
export function sparkOption(
  series: number[],
  accent: string,
  plotType: 'line' | 'bar',
  area: boolean,
): EChartsOption {
  return {
    animation: false,
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    tooltip: { show: false },
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: plotType === 'bar',
      data: series.map((_, i) => i),
    },
    yAxis: { type: 'value', show: false, scale: true },
    series: [
      plotType === 'bar'
        ? { type: 'bar', data: series, barWidth: '60%', itemStyle: { color: accent, borderRadius: 1 } }
        : {
            type: 'line',
            data: series,
            symbol: 'none',
            lineStyle: { color: accent, width: 2 },
            ...(area ? { areaStyle: { color: withAlpha(accent, 0.18) } } : {}),
          },
    ],
  }
}
export default function KpiCardV2({
  kpi, series, onDetails,
}: { kpi: Kpi; series: number[]; onDetails?: (kpi: Kpi) => void }) {
  const up = kpi.delta >= 0
  const { accent } = metaFor(kpi.key)
  const kind = VIZ[kpi.key] ?? 'area'
  const plotType = kind === 'column' ? 'bar' : 'line'
  const area = kind === 'area'

  return (
    <Card className="flex h-full flex-col p-4">
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

      <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', fontSize: '0.625rem', fontWeight: 500 }}>
          {VIZ_CAPTION[kpi.key] ?? 'vs last month'}
        </Typography>
        {onDetails && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-accent" onClick={() => onDetails(kpi)}>Details</Button>
        )}
      </Box>
    </Card>
  )
}
