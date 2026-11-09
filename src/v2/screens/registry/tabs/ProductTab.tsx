'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Trash2 } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { IconButton } from '@/src/ds/components/IconButton'
import { Textfield } from '@/src/ds/components/Textfield'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { cn } from '@/src/ds/helpers/cn'
import UploadIcon from '@mui/icons-material/FileUploadOutlined'
import type { ProductData, ResultsData } from '@/src/shared/data/batchForm'
import { ensureVariable, useResultVariables } from '@/src/shared/lib/resultVariables'
import VariableField from '@/src/v2/components/VariableField'
import { dsTable, withAlpha } from '../ui'
import { EditableCard, useEditing } from '../cardEdit'
import RichTextField from '@/src/v2/components/RichTextField'

interface Props {
  value: ProductData
  onChange: (v: ProductData) => void
  /** The Results dataset — the expected values live next to the variables they
   *  belong to, so the Results table can show target and measurement together. */
  results: ResultsData
  onResultsChange: (v: ResultsData) => void
}

export default function ProductTab({ value, onChange, results, onResultsChange }: Props) {
  const set = <K extends keyof ProductData>(key: K, v: ProductData[K]) => onChange({ ...value, [key]: v })

  const expected = results.expected ?? {}
  const entries = Object.entries(expected)
  const [varDraft, setVarDraft] = useState('')
  const [valDraft, setValDraft] = useState('')

  // Options come from the catalog in Settings › Production.
  const [catalog, setCatalog] = useResultVariables()
  const editInfo = useEditing('product-info')
  const editExpected = useEditing('product-expected')
  const editFiles = useEditing('product-attachments')

  // Adding a target also creates the variable on the Results tab (if it is not
  // there yet), so the column the operator will type into already exists.
  const withTargets = (targets: Record<string, string>) => {
    let { variables, rows } = results
    const next = { ...expected }
    for (const [typed, val] of Object.entries(targets)) {
      const canonical = ensureVariable(catalog, setCatalog, typed)
      const name = variables.find((x) => x.toLowerCase() === canonical.toLowerCase()) ?? canonical
      if (!variables.includes(name)) {
        variables = [...variables, name]
        rows = rows.map((r) => ({ ...r, values: { ...r.values, [name]: '' } }))
      }
      next[name] = val
    }
    onResultsChange({ ...results, variables, rows, expected: next })
  }

  const addExpected = () => {
    if (!varDraft.trim()) return
    withTargets({ [varDraft]: valDraft.trim() })
    setVarDraft('')
    setValDraft('')
  }

  const setExpected = (v: string, val: string) =>
    onResultsChange({ ...results, expected: { ...expected, [v]: val } })

  // Removing a target drops the Results column too — but only while nothing has
  // been measured for it, so a delete here can never destroy recorded data.
  const removeExpected = (v: string) => {
    const { [v]: _dropped, ...rest } = expected
    const measured = results.rows.some((r) => (r.values[v] ?? '') !== '')
    onResultsChange({
      ...results,
      expected: rest,
      variables: measured ? results.variables : results.variables.filter((x) => x !== v),
      rows: measured
        ? results.rows
        : results.rows.map((r) => {
            const { [v]: _drop, ...values } = r.values
            return { ...r, values }
          }),
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <EditableCard cardId="product-info" title="Information">
        {/* Remount on mode change so Discard shows the saved text again. */}
        <RichTextField
          key={editInfo ? 'edit' : 'view'}
          value={value.details}
          onChange={(html) => set('details', html)}
          readOnly={!editInfo}
          placeholder="Write product information here"
        />
        {!editInfo && !value.details && (
          <Typography variant="body2" color="text.secondary">No product information yet.</Typography>
        )}
      </EditableCard>

      <EditableCard cardId="product-expected" title="Expected Results">
        <Typography variant="body2" color="text.secondary">
          Set the value each variable is expected to reach. Variables added here become columns on the
          Results tab, where the target is shown next to what was measured. The variable list is managed
          in Settings › Production.
        </Typography>

        <div className={cn(dsTable.wrap, 'mt-4')}>
          <table className={cn(dsTable.table, 'min-w-[420px]')}>
            <thead>
              <tr className={dsTable.headRow}>
                <th scope="col" className={cn(dsTable.th, 'w-[220px] py-2')}>Variable</th>
                <th scope="col" className={cn(dsTable.th, 'py-2')}>Expected value</th>
                {editExpected && <th scope="col" className={cn(dsTable.th, 'w-[72px] py-2')}><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {entries.map(([v, val]) => (
                <tr key={v} className={dsTable.row}>
                  <td className={cn(dsTable.td, 'py-2 font-medium')}>{v}</td>
                  <td className={cn(dsTable.td, 'py-2 tabular-nums')}>
                    {editExpected ? (
                      <div className="w-[120px]">
                        <Textfield
                          value={val}
                          onChange={(e) => setExpected(v, e.target.value)}
                          placeholder="0000"
                          aria-label={`Expected value for ${v}`}
                          className="h-8"
                        />
                      </div>
                    ) : (val || '—')}
                  </td>
                  {editExpected && (
                    <td className={cn(dsTable.td, 'py-2 text-right')}>
                      <Tooltip content="Remove">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => removeExpected(v)}
                          aria-label={`Remove ${v}`}
                          icon={<Trash2 className="size-4" />}
                        />
                      </Tooltip>
                    </td>
                  )}
                </tr>
              ))}

              {entries.length === 0 && (
                <tr className="border-b border-border last:border-0">
                  <td colSpan={editExpected ? 3 : 2} className="px-4 py-5 text-text-muted">
                    No expected values yet.
                  </td>
                </tr>
              )}

              {/* input row — only while the card is in edit mode */}
              {editExpected && (
              <tr className="bg-surface">
                <td className={cn(dsTable.td, 'py-2')}>
                  <VariableField value={varDraft} onChange={setVarDraft} catalog={catalog} exclude={Object.keys(expected)} />
                </td>
                <td className={cn(dsTable.td, 'py-2')}>
                  <div className="w-[120px]">
                    <Textfield
                      value={valDraft}
                      onChange={(e) => setValDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addExpected()}
                      placeholder="0000"
                      aria-label="Expected value"
                      className="h-8"
                    />
                  </div>
                </td>
                <td className={cn(dsTable.td, 'py-2 text-right')}>
                  <Button size="sm" variant="secondary" onClick={addExpected} disabled={!varDraft.trim()} className="whitespace-nowrap">
                    + Add
                  </Button>
                </td>
              </tr>
              )}
            </tbody>
          </table>
        </div>
      </EditableCard>

      <EditableCard cardId="product-attachments" title="Attachments">
        {!editFiles ? (
          <Typography variant="body2" color="text.secondary">No attachments yet.</Typography>
        ) : (
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            gap: 1,
            py: 5,
            borderRadius: 2,
            border: '2px dashed',
            borderColor: (t) => withAlpha(t.palette.primary.main, 0.4),
            bgcolor: (t) => withAlpha(t.palette.primary.main, 0.06),
            color: 'primary.main',
            cursor: 'pointer',
          }}
        >
          <UploadIcon />
          <Typography variant="body2">Drag files here or click to upload</Typography>
        </Box>
        )}
      </EditableCard>
    </Box>
  )
}
