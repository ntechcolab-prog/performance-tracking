'use client'

import { forwardRef, type ReactNode } from 'react'
import { Card } from '@/src/ds/components/Card'
import { cn } from '@/src/ds/helpers/cn'
import { Textfield, type TextfieldProps } from '@/src/ds/components/Textfield'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Small MUI presentational helpers for the Registry v2 screen. Kept local to
// this folder (duplicated rather than shared) so parallel v2 rebuilds never
// collide. Mirrors the Tailwind FormSection / key-value groups from v0/v1.

// Section card with an uppercase label — the batch editor's building block.
export function SectionCard({
  title,
  action,
  children,
  id,
  editing = false,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  id?: string
  /** Card is in edit mode (see cardEdit.tsx) — outlined in the primary colour. */
  editing?: boolean
}) {
  return (
    <Card
      id={id}
      className={cn(
        'overflow-visible p-6 scroll-mt-4 transition-[border-color,box-shadow] duration-150',
        editing && 'border-accent ring-1 ring-accent',
      )}
    >
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Typography
          variant="overline"
          sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.06em' }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Card>
  )
}

// A single labelled stat (small caps label above a value / node).
export function Stat({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', fontSize: '0.6875rem' }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 500, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
        {children ?? value}
      </Box>
    </Box>
  )
}

// A definition-list style key/value block with divider rows.
export function KvList({ rows }: { rows: string[][] }) {
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {rows.map(([k, v], i) => (
        <Box
          key={k}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 1.25,
            fontSize: '0.875rem',
            borderTop: i === 0 ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box component="dt" sx={{ color: 'text.secondary' }}>{k}</Box>
          <Box component="dd" sx={{ m: 0, textAlign: 'right', fontWeight: 500, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
            {v}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export function KvGroup({ heading, rows }: { heading: string; rows: string[][] }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ display: 'block', mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'primary.dark' }}
      >
        {heading}
      </Typography>
      <KvList rows={rows} />
    </Box>
  )
}

// hex + alpha → rgba string (for soft tints without the theme alpha helper).
export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// Class names that mirror the DS <Table> look, for the tables the DS Table
// cannot render (clickable rows, inline editors in header cells, colSpan rows).
export const dsTable = {
  wrap: 'overflow-x-auto rounded-card border border-border',
  table: 'w-full border-collapse text-sm',
  headRow: 'border-b border-border bg-surface-sunken',
  th: 'px-4 py-3 text-left font-semibold text-text whitespace-nowrap',
  row: 'border-b border-border last:border-0 odd:bg-surface-raised even:bg-surface transition-colors hover:bg-surface-sunken',
  td: 'px-4 py-3 text-text',
} as const

// Compact DS text field for the inline row editors (fixed width, or full width).
export const CellInput = forwardRef<HTMLInputElement, TextfieldProps & { width?: number }>(
  ({ width, ...rest }, ref) => (
    <div style={{ width: width ?? '100%' }}>
      <Textfield ref={ref} className="h-8 px-2" {...rest} />
    </div>
  ),
)
CellInput.displayName = 'CellInput'
