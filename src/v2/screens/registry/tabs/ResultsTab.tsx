'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { CircleCheck, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { Badge } from '@/src/ds/components/Badge'
import { IconButton } from '@/src/ds/components/IconButton'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { Table, type Column } from '@/src/ds/components/Table'
import { cn } from '@/src/ds/helpers/cn'
import type { ResultsData, ResultRow } from '@/src/shared/data/batchForm'
import { maskDate, maskTime } from '@/src/shared/lib/masks'
import { deltaLabel } from '@/src/shared/lib/expected'
import { EditableCard, useEditing } from '../cardEdit'
import { CellInput } from '../ui'

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
  // Cells of the rows drawn outside the DS Table's columns (summary, editors).
  const td = 'px-4 py-2 text-text'
  const summaryTd = cn(td, 'bg-surface-sunken/60')
  const editTd = cn(td, 'bg-surface-sunken/60')
  const tableRows = value.rows.map((r, i) => ({ id: i, i, r }))
  type Row = (typeof tableRows)[number]
  const columns: Column<Row>[] = [
    { key: 'r', id: 'date', header: 'DATE', className: 'py-2', render: ({ r }) => r.date },
    { key: 'r', id: 'time', header: 'Time', className: 'py-2', render: ({ r }) => <span className="text-text-muted">{r.time}</span> },
    ...value.variables.map((v): Column<Row> => ({
      key: 'r', id: `var-${v}`, header: v, className: 'py-2 tabular-nums', render: ({ r }) => r.values[v] || '—',
    })),
    {
      key: 'i',
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'whitespace-nowrap py-2 text-right',
      render: ({ i }) =>
        on && (
          <>
            <Tooltip content="Edit"><IconButton size="sm" variant="ghost" onClick={() => startRowEdit(i)} aria-label={`Edit row ${i + 1}`} icon={<Pencil className="size-4" />} /></Tooltip>
            <Tooltip content="Delete"><IconButton size="sm" variant="ghost" className="text-danger" onClick={() => removeRow(i)} aria-label={`Delete row ${i + 1}`} icon={<Trash2 className="size-4" />} /></Tooltip>
          </>
        ),
    },
  ]
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

      <Table
        className="mt-5 [&_table]:min-w-[640px]"
        columns={columns}
        data={tableRows}
        prependRows={
          hasExpected && (
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
          )
        }
        // The row being edited turns into an inline editor.
        renderRow={(row) =>
          on && editRow === row.i ? (
            <>
              <td className={editTd}><CellInput width={120} value={rowDraft.date} onChange={(e) => setRowDraft({ ...rowDraft, date: maskDate(e.target.value) })} placeholder="DD/MM/YYYY" aria-label={`Row ${row.i + 1} date`} /></td>
              <td className={editTd}><CellInput width={100} value={rowDraft.time} onChange={(e) => setRowDraft({ ...rowDraft, time: maskTime(e.target.value) })} placeholder="00:00:00" aria-label={`Row ${row.i + 1} time`} /></td>
              {value.variables.map((v) => (
                <td key={v} className={editTd}>
                  <CellInput width={84} value={rowDraft.values[v] ?? ''} onChange={(e) => setRowDraft({ ...rowDraft, values: { ...rowDraft.values, [v]: e.target.value } })} placeholder="0000" aria-label={`Row ${row.i + 1} ${v}`} />
                </td>
              ))}
              <td className={cn(editTd, 'whitespace-nowrap text-right')}>
                <IconButton size="sm" variant="ghost" className="text-success" onClick={saveRowEdit} aria-label={`Save row ${row.i + 1}`} icon={<CircleCheck className="size-4" />} />
                <IconButton size="sm" variant="ghost" onClick={() => setEditRow(null)} aria-label="Cancel" icon={<X className="size-4" />} />
              </td>
            </>
          ) : null
        }
        empty={on ? undefined : <div className="py-2">No samples yet.</div>}
        appendRows={
          on && (
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
          )
        }
      />
    </EditableCard>
  )
}
