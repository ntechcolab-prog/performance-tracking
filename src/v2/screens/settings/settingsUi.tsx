'use client'

import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import { Card } from '@/src/ds/components/Card'

// Local mirrors of the Tailwind FormSection/Field helpers. Duplicated inside
// this folder (per the v2 isolation rule) rather than imported from the shared
// Tailwind FormControls, so parallel agents never collide.

export function FormSectionV2({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="overflow-visible p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          {title}
        </span>
        {action}
      </div>
      {children}
    </Card>
  )
}

export function FieldV2({
  label,
  children,
  sx,
}: {
  label: string
  children: ReactNode
  sx?: object
}) {
  return (
    <Box sx={sx}>
      <label className="mb-1.5 block text-sm text-text-muted">{label}</label>
      {children}
    </Box>
  )
}
