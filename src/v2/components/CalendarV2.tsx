'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { iris } from '@/src/shared/client/mui/theme'
import { withAlpha } from '@/src/shared/viz/metricViz'
import type { DayRollup } from '@/src/shared/lib/compute'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarV2Props {
  year: number
  month: number // 0-indexed
  dayMap: Map<number, DayRollup>
  avgMass: number
  onDetails?: (day: number, data: DayRollup) => void
  availByDay?: Map<number, number>
}

// Month heatmap — cells tinted by mass relative to the daily average. Reuses the
// same byDay rollup as v0/v1; only the rendering is MUI.
export default function CalendarV2({ year, month, dayMap, avgMass, onDetails, availByDay }: CalendarV2Props) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>Calendar</Typography>
      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {WEEKDAYS.map((d) => (
          <Typography key={d} variant="caption" align="center" color="text.secondary" sx={{ fontWeight: 600 }}>{d}</Typography>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <Box key={`e${i}`} />
          const data = dayMap.get(day)
          const intensity = data && avgMass > 0 ? Math.min(data.mass / (avgMass * 1.8), 1) : 0
          const avail = availByDay?.get(day)
          const cell = (
            <Box
              onClick={() => data && onDetails?.(day, data)}
              sx={{
                aspectRatio: '1 / 1', borderRadius: 1.5, p: 0.75,
                border: '1px solid', borderColor: 'divider',
                bgcolor: data ? withAlpha(iris.primary, 0.1 + intensity * 0.6) : 'transparent',
                cursor: data ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'transform 0.15s', '&:hover': data ? { transform: 'translateY(-2px)' } : {},
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: intensity > 0.5 ? '#fff' : 'text.secondary' }}>
                {String(day).padStart(2, '0')}
              </Typography>
              {data && (
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: intensity > 0.5 ? '#fff' : 'text.primary' }}>
                  {data.count} · {data.mass.toFixed(1)}t
                </Typography>
              )}
              {avail != null && (
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: intensity > 0.5 ? 'rgba(255,255,255,0.8)' : 'text.disabled' }}>
                  {Math.round(avail)}%
                </Typography>
              )}
            </Box>
          )
          return data ? (
            <Tooltip key={day} content={`${data.count} batches · ${data.mass.toFixed(1)} ton`}>{cell}</Tooltip>
          ) : (
            <Box key={day}>{cell}</Box>
          )
        })}
      </Box>
    </Box>
  )
}
