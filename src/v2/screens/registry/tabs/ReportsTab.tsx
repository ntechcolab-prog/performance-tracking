'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import { Card } from '@/src/ds/components/Card'
import { Button } from '@/src/ds/components/Button'
import { Radio } from '@/src/ds/components/Radio'
import { cn } from '@/src/ds/helpers/cn'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import type { ReportItem } from '@/src/shared/data/batchForm'
import { SectionCard, withAlpha } from '../ui'

const TEMPLATES = [
  { id: 'standard-protocol', name: 'Standard Protocol', desc: 'This report contains a chart and a table.' },
  { id: 'standard-protocol-2', name: 'Standard Protocol 2', desc: 'This report contains a chart and a table.' },
  { id: 'standard-protocol-3', name: 'Standard Protocol 3', desc: 'This report contains a chart and a table.' },
]

export default function ReportsTab({ value, onChange }: { value: ReportItem[]; onChange: (v: ReportItem[]) => void }) {
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState(TEMPLATES[1].id)

  const create = () => {
    const tpl = TEMPLATES.find((t) => t.id === selected)!
    onChange([...value, { id: `RPT-${1000 + value.length + 1}`, template: tpl.name, createdAt: '09/06/2026, 13:45' }])
    setPicking(false)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!picking ? (
        <Button
          onClick={() => setPicking(true)}
          variant="secondary"
          size="lg"
          leadingIcon={<Plus className="size-5" />}
          className="h-16 w-full border-accent text-accent"
        >
          Create a Report
        </Button>
      ) : (
        <>
          <SectionCard title="Template">
            <Typography variant="body2" sx={{ mb: 2.5, color: 'text.primary' }}>Select the template you want to use.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
              {TEMPLATES.map((t) => {
                const active = t.id === selected
                return (
                  <Card
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className={cn('cursor-pointer p-4 text-left transition-colors', active ? 'border-accent ring-1 ring-accent' : 'border-border')}
                  >
                    <Box sx={{ position: 'relative', height: 128, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'background.default' }}>
                      <Radio
                        checked={active}
                        onChange={() => setSelected(t.id)}
                        name="report-template"
                        aria-label={t.name}
                        className="absolute left-2 top-2"
                      />
                      <TemplateThumb />
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t.desc}</Typography>
                  </Card>
                )
              })}
            </Box>
          </SectionCard>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button onClick={() => setPicking(false)} variant="primary" leadingIcon={<ChevronLeft className="size-4" />}>Back</Button>
            <Button onClick={create} variant="primary">Next<ChevronRight className="size-4" aria-hidden /></Button>
          </Box>
        </>
      )}

      {value.length > 0 && (
        <SectionCard title="Generated reports">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {value.map((r) => (
              <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: (t) => withAlpha(t.palette.primary.main, 0.12), color: 'primary.main' }}>
                    <DescriptionIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.template}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.id} · {r.createdAt}</Typography>
                  </Box>
                </Box>
                <Button size="sm" variant="ghost" className="text-accent" leadingIcon={<Download className="size-4" />}>Download</Button>
              </Box>
            ))}
          </Box>
        </SectionCard>
      )}
    </Box>
  )
}

function TemplateThumb() {
  return (
    <svg width="120" height="78" viewBox="0 0 120 78" fill="none">
      <rect x="0" y="0" width="120" height="78" rx="6" fill="#e7e7e7" />
      <g fill="#c3c5c7">
        {[34, 26, 38, 22, 30, 18].map((h, i) => (
          <rect key={i} x={20 + i * 9} y={50 - h} width="5" height={h} rx="1" />
        ))}
        <rect x="20" y="56" width="50" height="4" rx="2" />
        <rect x="20" y="64" width="64" height="4" rx="2" />
      </g>
    </svg>
  )
}
