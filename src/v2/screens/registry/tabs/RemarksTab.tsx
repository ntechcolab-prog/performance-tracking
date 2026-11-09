'use client'

import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { CircleCheck, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { IconButton } from '@/src/ds/components/IconButton'
import { Textarea } from '@/src/ds/components/Textarea'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { cn } from '@/src/ds/helpers/cn'
import type { RemarksData, NoteRow, ResultsData } from '@/src/shared/data/batchForm'
import { maskDate, maskTime } from '@/src/shared/lib/masks'
import { CellInput, SectionCard, dsTable } from '../ui'
import { EditableCard, useCardEdit } from '../cardEdit'
import type { ChartNote } from '../SensorChartV2'
import BatchGraph, { GRAPH_X_LABELS, timeToFrac } from '../BatchGraph'

const todayMasked = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function RemarksTab({ value, onChange, results }: { value: RemarksData; onChange: (v: RemarksData) => void; results: ResultsData }) {
  const [draft, setDraft] = useState<NoteRow>({ date: '', time: '', comment: '' })
  const [hoverNote, setHoverNote] = useState<number | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<NoteRow>({ date: '', time: '', comment: '' })
  const commentRef = useRef<HTMLInputElement>(null)
  const { editing, start } = useCardEdit()
  const on = editing === 'remarks-notes'
  const onConclusion = editing === 'remarks-conclusion'

  // Leaving edit mode drops any half-typed note.
  const [wasOn, setWasOn] = useState(on)
  if (wasOn !== on) {
    setWasOn(on)
    setEditIdx(null)
    setDraft({ date: '', time: '', comment: '' })
  }

  const addNote = () => {
    if (!draft.comment.trim()) return
    onChange({ ...value, notes: [...value.notes, draft] })
    setDraft({ date: '', time: '', comment: '' })
  }
  const startEdit = (i: number) => { setEditIdx(i); setEditDraft(value.notes[i]) }
  const saveEdit = () => {
    if (editIdx == null || !editDraft.comment.trim()) return
    onChange({ ...value, notes: value.notes.map((n, idx) => (idx === editIdx ? editDraft : n)) })
    setEditIdx(null)
  }
  const deleteNote = (i: number) => {
    onChange({ ...value, notes: value.notes.filter((_, idx) => idx !== i) })
    if (editIdx === i) setEditIdx(null)
  }

  // Clicking the chart starts a note at that time — fill the comment and Add.
  // It opens the Notes card for editing first (asking if another card is dirty).
  const noteFromChart = (pointIdx: number) => {
    if (!on) start('remarks-notes')
    setDraft((d) => ({
      ...d,
      date: d.date || todayMasked(),
      time: `${GRAPH_X_LABELS[pointIdx]}:00`,
    }))
    window.setTimeout(() => commentRef.current?.focus(), 0)
  }

  // Notes that fall inside the chart window appear as numbered markers.
  const chartNotes: ChartNote[] = value.notes
    .map((n) => {
      const frac = timeToFrac(n.time)
      return frac == null ? null : { frac, label: [n.date, n.time].filter(Boolean).join(' · '), comment: n.comment }
    })
    .filter((n): n is ChartNote => n !== null)

  // Index of a table note within chartNotes (for badge numbering + hover link).
  const chartNoteIndex = (n: NoteRow) =>
    chartNotes.findIndex((c) => c.comment === n.comment && c.label.includes(n.time))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <EditableCard cardId="remarks-notes" title="Notes">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Tip: click a point on the graph below to start a note at that time — it shows up as a numbered marker.
        </Typography>
        <div className={dsTable.wrap}>
          <table className={dsTable.table}>
            <thead>
              <tr className={dsTable.headRow}>
                <th scope="col" className={cn(dsTable.th, 'w-[150px] py-2')}>DATE</th>
                <th scope="col" className={cn(dsTable.th, 'w-[130px] py-2')}>TIME</th>
                <th scope="col" className={cn(dsTable.th, 'py-2')}>COMMENTS</th>
                <th scope="col" className={cn(dsTable.th, 'py-2 text-right')}>{on ? 'ACTIONS' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {value.notes.map((n, i) =>
                on && editIdx === i ? (
                  <tr key={i} className="border-b border-border bg-surface-sunken/60">
                    <td className={cn(dsTable.td, 'py-2')}><CellInput value={editDraft.date} onChange={(e) => setEditDraft({ ...editDraft, date: maskDate(e.target.value) })} placeholder="DD/MM/YYYY" aria-label={`Note ${i + 1} date`} /></td>
                    <td className={cn(dsTable.td, 'py-2')}><CellInput value={editDraft.time} onChange={(e) => setEditDraft({ ...editDraft, time: maskTime(e.target.value) })} placeholder="00:00:00" aria-label={`Note ${i + 1} time`} /></td>
                    <td className={cn(dsTable.td, 'py-2')}><CellInput value={editDraft.comment} onChange={(e) => setEditDraft({ ...editDraft, comment: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} placeholder="Write here" aria-label={`Note ${i + 1} comment`} /></td>
                    <td className={cn(dsTable.td, 'whitespace-nowrap py-2 text-right')}>
                      <IconButton size="sm" variant="ghost" className="text-success" onClick={saveEdit} aria-label="Save note" icon={<CircleCheck className="size-4" />} />
                      <IconButton size="sm" variant="ghost" onClick={() => setEditIdx(null)} aria-label="Cancel" icon={<X className="size-4" />} />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={i}
                    className={dsTable.row}
                    onMouseEnter={() => {
                      const idx = chartNoteIndex(n)
                      if (idx >= 0) setHoverNote(idx)
                    }}
                    onMouseLeave={() => setHoverNote(null)}
                  >
                    <td className={cn(dsTable.td, 'py-2 text-text-muted')}>{n.date}</td>
                    <td className={cn(dsTable.td, 'py-2 text-text-muted')}>{n.time}</td>
                    <td className={cn(dsTable.td, 'py-2')}>
                      {chartNoteIndex(n) >= 0 && (
                        <span className="mr-2 inline-grid size-4 place-items-center rounded-round bg-accent align-middle text-[0.625rem] font-bold text-on-accent">
                          {chartNoteIndex(n) + 1}
                        </span>
                      )}
                      {n.comment}
                    </td>
                    <td className={cn(dsTable.td, 'whitespace-nowrap py-2 text-right')}>
                      {on && (
                        <>
                          <Tooltip content="Edit"><IconButton size="sm" variant="ghost" onClick={() => startEdit(i)} aria-label={`Edit note ${i + 1}`} icon={<Pencil className="size-4" />} /></Tooltip>
                          <Tooltip content="Delete"><IconButton size="sm" variant="ghost" className="text-danger" onClick={() => deleteNote(i)} aria-label={`Delete note ${i + 1}`} icon={<Trash2 className="size-4" />} /></Tooltip>
                        </>
                      )}
                    </td>
                  </tr>
                )
              )}
              {on && (
              <tr className="bg-surface-sunken/60">
                <td className={cn(dsTable.td, 'py-2')}><CellInput value={draft.date} onChange={(e) => setDraft({ ...draft, date: maskDate(e.target.value) })} placeholder="DD/MM/YYYY" aria-label="New note date" /></td>
                <td className={cn(dsTable.td, 'py-2')}><CellInput value={draft.time} onChange={(e) => setDraft({ ...draft, time: maskTime(e.target.value) })} placeholder="00:00:00" aria-label="New note time" /></td>
                <td className={cn(dsTable.td, 'py-2')}><CellInput ref={commentRef} value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder="Write here" aria-label="New note comment" /></td>
                <td className={cn(dsTable.td, 'py-2 text-right')}><Button variant="secondary" size="sm" onClick={addNote} className="whitespace-nowrap">+ Add note</Button></td>
              </tr>
              )}
              {!on && value.notes.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-5 text-text-muted">No notes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </EditableCard>

      <SectionCard title="Graph">
        <BatchGraph notes={chartNotes} activeNote={hoverNote} onPlotClick={noteFromChart} results={results} />
      </SectionCard>

      <EditableCard cardId="remarks-conclusion" title="Conclusion">
        {onConclusion ? (
          <Textarea
            rows={4}
            value={value.conclusion}
            onChange={(e) => onChange({ ...value, conclusion: e.target.value })}
            placeholder="Write the conclusion of the test here."
            aria-label="Conclusion"
          />
        ) : value.conclusion ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{value.conclusion}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">No conclusion yet.</Typography>
        )}
      </EditableCard>
    </Box>
  )
}
