'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { chartPalette, iris } from '@/src/shared/client/mui/theme'
import { withAlpha } from '@/src/shared/viz/metricViz'
import type { Rankings, RankItem } from '@/src/shared/lib/compute'

// MUI-native rewrite of components/Rankings.tsx. Same data shape (Rankings from
// lib/compute) — three ranked panels rendered as horizontal value bars with a
// rich hover tooltip (the `extra` rows). Kept as MUI Box/Tooltip primitives
// rather than an X BarChart because the per-item enrichment tooltip is the
// distinctive feature and reads cleaner as native MUI chrome.

interface RankingsV2Props {
  rankings: Rankings
  /** When true, render flush inside a parent card (no own card chrome) so it
   *  reads as part of the same filtered view. */
  embedded?: boolean
}

const fmt = (v: number) =>
  v >= 1000
    ? `${(Math.round(v / 100) / 10).toLocaleString('en-US')}K`
    : `${Math.round(v * 10) / 10}`

function niceMax(max: number, count = 5): number {
  if (max <= 0) return 1
  const rawStep = max / (count - 1)
  const mag = 10 ** Math.floor(Math.log10(rawStep))
  const norm = rawStep / mag
  const stepMul = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  const step = stepMul * mag
  return Math.ceil(max / step) * step
}

function RankTooltip({ item }: { item: RankItem }) {
  return (
    <Box sx={{ minWidth: 160 }}>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
        {item.label}
      </Typography>
      {item.extra?.map((row) => (
        <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>{row.label}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function RankBars({ data, valueLabel }: { data: RankItem[]; valueLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const axisMax = niceMax(Math.max(...data.map((d) => d.value), 0))

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {data.map((d, i) => {
          const w = Math.max((d.value / axisMax) * 100, d.value > 0 ? 7 : 0)
          const color = chartPalette[i % chartPalette.length]
          const active = hover === i
          const bar = (
            <Box
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Typography
                variant="caption"
                sx={{ width: 14, flexShrink: 0, textAlign: 'right', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
              >
                {i + 1}
              </Typography>
              <Box sx={{ position: 'relative', flex: 1, height: 28, borderRadius: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                <Box
                  sx={{
                    height: '100%', display: 'flex', alignItems: 'center', px: 1.25, borderRadius: 1,
                    width: `${w}%`,
                    background: `linear-gradient(180deg, ${withAlpha(color, 0.86)} 0%, ${color} 100%)`,
                    filter: active ? 'saturate(1.15) brightness(1.05)' : undefined,
                    transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: '#fff', fontWeight: 600, textShadow: '0 1px 1px rgba(0,0,0,0.15)' }}
                  >
                    {d.label}
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="caption"
                sx={{ width: 32, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  color: active ? 'text.primary' : 'text.secondary' }}
              >
                {fmt(d.value)}
              </Typography>
            </Box>
          )
          return d.extra && d.extra.length > 0 ? (
            // DS Tooltip takes over the trigger's mouse handlers, so it wraps the
            // bar in its own div and the bar keeps its hover highlight.
            <Tooltip key={d.label} content={<RankTooltip item={d} />} side="top" delay={100}>
              <div>{bar}</div>
            </Tooltip>
          ) : (
            <Box key={d.label}>{bar}</Box>
          )
        })}
      </Box>
      {valueLabel && (
        <Typography
          variant="caption"
          align="center"
          sx={{ display: 'block', mt: 1, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.disabled', fontSize: '0.625rem' }}
        >
          {valueLabel}
        </Typography>
      )}
    </Box>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: withAlpha(iris.page, 0.5), p: 2 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: 'text.secondary', fontSize: '0.6875rem' }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  )
}

export default function RankingsV2({ rankings, embedded = false }: RankingsV2Props) {
  return (
    <Box
      sx={
        embedded
          ? { borderTop: '1px solid', borderColor: 'divider', px: 3, pb: 3, pt: 2.5 }
          : { borderRadius: 2.5, bgcolor: 'background.paper', p: 3, border: '1px solid', borderColor: 'divider' }
      }
    >
      <Typography
        variant="overline"
        sx={{ display: 'block', mb: 2.5, fontWeight: 600, color: 'text.primary' }}
      >
        Rankings
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
        <Panel title="Interruptions">
          <RankBars data={rankings.interruptions} />
        </Panel>
        <Panel title="Recipes">
          <RankBars data={rankings.recipes} valueLabel="kg produced" />
        </Panel>
        <Panel title="Status">
          <RankBars data={rankings.status} />
        </Panel>
      </Box>
    </Box>
  )
}
