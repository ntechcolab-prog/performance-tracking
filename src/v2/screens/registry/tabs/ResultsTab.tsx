'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { CircleCheck, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { Badge } from '@/src/ds/components/Badge'
import { IconButton } from '@/src/ds/components/IconButton'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { cn } from '@/src/ds/helpers/cn'
import type { ResultsData, ResultRow } from '@/src/shared/data/batchForm'
import { maskDate, maskTime } from '@/src/shared/lib/masks'
import { deltaLabel } from '@/src/shared/lib/expected'
import { EditableCard, useEditing } from '../cardEdit'
import { CellInput, dsTable } from '../ui'

const emptyDraft = (vars: string[]): ResultRow => ({
  date: '', time: '', values: Object.fromEntries(vars.map((v) => [v, ''])),
})

export default function ResultsTab({ value, onChange }: { value: ResultsData; onChange: (v: ResultsData) => void }) {
  const on = useEditing('results')
  const [draft, setDraft] = useState<ResultRow>(emptyDraft(value.variables))
  const [editRow, setEditRow] = useState<number | null>(null)
  const [rowDraft, setRowDraft] = useState<ResultRow>(emptyDraft(value.variables))

  // Leaving edit mode (Save or Discard) drops any half-typed row.
  const [wasOn, setWasOn] = useState(on)
  if (wasOn !== on) {
    setWasOn(on)
    setEditRow(null)
    setDraft(emptyDraft(value.variables))
  }

  const addRow = () => {
    if (!draft.date && !draft.time && Object.values(draft.values).every((x) => !x)) return
    onChange({ ...value, rows: [...value.rows, draft] })
    setDraft(emptyDraft(value.variables))
  }
  const removeRow = (i: number) => onChange({ ...value, rows: value.rows.filter((_, idx) => idx !== i) })
  const startRowEdit = (i: number) => { setEditRow(i); setRowDraft(value.rows[i]) }
  const saveRowEdit = () => {
    if (editRow == null) return
    onChange({ ...value, rows: value.rows.map((r, idx) => (idx === editRow ? rowDraft : r)) })
    setEditRow(null)
  }

  const importSample = () => {
    const sample: ResultRow = {
      date: '19/11/2024',
      time: '12:15:00',
      values: Object.fromEntries(value.variables.map((v) => [v, (Math.round(Math.random() * 1000) / 100).toString()])),
    }
    onChange({ ...value, rows: [...value.rows, sample] })
  }

  const hasExpected = Object.keys(value.expected ?? {}).length > 0
  // "Last Sample" = the most recent row that has at least one measured value.
  const lastSample = [...value.rows].reverse().find((r) => value.variables.some((v) => (r.values[v] ?? '') !== ''))
  const td = cn(dsTable.td, 'py-2')
  const summaryTd = cn(td, 'bg-surface-sunken/60')
  const summaryLabel = 'text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-text-muted'

  return (
    <EditableCard
      cardId="results"
      title="Enter Test Results"
      extraAction={on && <Button size="sm" variant="secondary" onClick={importSample}>Import</Button>}
    >
      <Typography variant="body2" color="text.secondary">
        {on ? 'Enter each sample in the grey row and press + Add row.' : 'Measured values for each variable of this batch.'}
      </Typography>

      {/* Variables mirror Product → Expected Results and are managed only there. */}
      {value.variables.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {value.variables.map((v) => <Badge key={v} variant="accent" size="sm">{v}</Badge>)}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            Variables are managed in Product → Expected Results.
          </Typography>
        </Box>
      )}

      <div className={cn(dsTable.wrap, 'mt-5')}>
        <table className={cn(dsTable.table, 'min-w-[640px]')}>
          <thead>
            <tr className={dsTable.headRow}>
              <th scope="col" className={cn(dsTable.th, 'py-2')}>DATE</th>
              <th scope="col" className={cn(dsTable.th, 'py-2')}>Time</th>
              {value.variables.map((v) => <th key={v} scope="col" className={cn(dsTable.th, 'py-2')}>{v}</th>)}
              <th scope="col" className={cn(dsTable.th, 'py-2')}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {/* Target vs last sample, aligned with each variable column.
                Only rendered once the batch has at least one expected value. */}
            {hasExpected && (
              <>
                <tr className="border-b border-border">
                  <td className={cn(summaryTd, summaryLabel)}>Expected</td>
                  <td className={summaryTd} />
                  {value.variables.map((v) => (
                    <td key={v} className={cn(summaryTd, 'tabular-nums')}>
                      {value.expected?.[v] || '—'}
                    </td>
                  ))}
                  <td className={summaryTd} />
                </tr>
                <tr className="border-b-2 border-border">
                  <td className={cn(summaryTd, 'align-top')}>
                    <span className={cn(summaryLabel, 'block')}>Last Sample</span>
                    {lastSample?.date || '—'}
                  </td>
                  <td className={cn(summaryTd, 'align-bottom text-text-muted')}>{lastSample?.time || ''}</td>
                  {value.variables.map((v) => {
                    const current = lastSample?.values[v] ?? ''
                    const diff = deltaLabel(value.expected?.[v], current)
                    return (
                      <td key={v} className={cn(summaryTd, 'align-bottom tabular-nums')}>
                        {current || '—'}
                        {diff && <span className="block text-[0.6875rem] text-text-muted">{diff}</span>}
                      </td>
                    )
                  })}
                  <td className={summaryTd} />
                </tr>
              </>
            )}

            {value.rows.map((r, i) =>
              on && editRow === i ? (
                <tr key={i} className="border-b border-border bg-surface-sunken/60">
                  <td className={td}><CellInput width={120} value={rowDraft.date} onChange={(e) => setRowDraft({ ...rowDraft, date: maskDate(e.target.value) })} placeholder="DD/MM/YYYY" aria-label={`Row ${i + 1} date`} /></td>
                  <td className={td}><CellInput width={100} value={rowDraft.time} onChange={(e) => setRowDraft({ ...rowDraft, time: maskTime(e.target.value) })} placeholder="00:00:00" aria-label={`Row ${i + 1} time`} /></td>
                  {value.variables.map((v) => (
                    <td key={v} className={td}>
                      <CellInput width={84} value={rowDraft.values[v] ?? ''} onChange={(e) => setRowDraft({ ...rowDraft, values: { ...rowDraft.values, [v]: e.target.value } })} placeholder="0000" aria-label={`Row ${i + 1} ${v}`} />
                    </td>
                  ))}
                  <td className={cn(td, 'whitespace-nowrap text-right')}>
                    <IconButton size="sm" variant="ghost" className="text-success" onClick={saveRowEdit} aria-label={`Save row ${i + 1}`} icon={<CircleCheck className="size-4" />} />
                    <IconButton size="sm" variant="ghost" onClick={() => setEditRow(null)} aria-label="Cancel" icon={<X className="size-4" />} />
                  </td>
                </tr>
              ) : (
                <tr key={i} className={dsTable.row}>
                  <td className={td}>{r.date}</td>
                  <td className={cn(td, 'text-text-muted')}>{r.time}</td>
                  {value.variables.map((v) => (
                    <td key={v} className={cn(td, 'tabular-nums')}>{r.values[v] || '—'}</td>
                  ))}
                  <td className={cn(td, 'whitespace-nowrap text-right')}>
                    {on && (
                      <>
                        <Tooltip content="Edit"><IconButton size="sm" variant="ghost" onClick={() => startRowEdit(i)} aria-label={`Edit row ${i + 1}`} icon={<Pencil className="size-4" />} /></Tooltip>
                        <Tooltip content="Delete"><IconButton size="sm" variant="ghost" className="text-danger" onClick={() => removeRow(i)} aria-label={`Delete row ${i + 1}`} icon={<Trash2 className="size-4" />} /></Tooltip>
                      </>
                    )}
                  </td>
                </tr>
              )
            )}

            {value.rows.length === 0 && !on && (
              <tr>
                <td colSpan={value.variables.length + 3} className="px-4 py-5 text-text-muted">
                  No samples yet.
                </td>
              </tr>
            )}

            {/* input row — the last grey row, with + Add row at its end */}
            {on && (
              <tr className="bg-surface-sunken/60">
                <td className={td}><CellInput width={120} value={draft.date} onChange={(e) => setDraft({ ...draft, date: maskDate(e.target.value) })} placeholder="DD/MM/YYYY" aria-label="New sample date" /></td>
                <td className={td}><CellInput width={100} value={draft.time} onChange={(e) => setDraft({ ...draft, time: maskTime(e.target.value) })} placeholder="00:00:00" aria-label="New sample time" /></td>
                {value.variables.map((v) => (
                  <td key={v} className={td}>
                    <CellInput width={84} value={draft.values[v] ?? ''} onChange={(e) => setDraft({ ...draft, values: { ...draft.values, [v]: e.target.value } })} onKeyDown={(e) => e.key === 'Enter' && addRow()} placeholder="0000" aria-label={`New sample ${v}`} />
                  </td>
                ))}
                <td className={cn(td, 'text-right')}>
                  <Button size="sm" variant="secondary" onClick={addRow} className="whitespace-nowrap">+ Add row</Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </EditableCard>
  )
}
