'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Button } from '@/src/ds/components/Button'
import { IconButton } from '@/src/ds/components/IconButton'
import { Table, type Column } from '@/src/ds/components/Table'
import { Textfield } from '@/src/ds/components/Textfield'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { AlertDialog } from '@/src/ds/components/AlertDialog'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import { findVariable, useResultVariables, type ResultVariable } from '@/src/shared/lib/resultVariables'
import { FormSectionV2 } from './settingsUi'

// Settings › Production. Owns the result variables catalog: the list batches pick
// their Expected Results from (Registry › Product) and that become Results columns.

const EMPTY: ResultVariable = { name: '', unit: '' }

export default function ProductionSettingsV2() {
  const [vars, setVars] = useResultVariables()
  // Row being edited: its index in the list, or 'new' for the add row.
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<ResultVariable>(EMPTY)
  const [toDelete, setToDelete] = useState<number | null>(null)

  const name = draft.name.trim()
  const clash = name ? findVariable(vars, name) : undefined
  const duplicate = !!clash && (editing === 'new' || vars[editing as number] !== clash)
  const canSave = !!name && !duplicate

  const startEdit = (i: number) => {
    setEditing(i)
    setDraft(vars[i])
  }
  const startAdd = () => {
    setEditing('new')
    setDraft(EMPTY)
  }
  const cancel = () => {
    setEditing(null)
    setDraft(EMPTY)
  }
  const save = () => {
    if (!canSave) return
    const next = { name, unit: draft.unit.trim() }
    setVars((prev) => (editing === 'new' ? [...prev, next] : prev.map((v, i) => (i === editing ? next : v))))
    cancel()
  }
  const remove = () => {
    if (toDelete === null) return
    setVars((prev) => prev.filter((_, i) => i !== toDelete))
    if (editing === toDelete) cancel()
    setToDelete(null)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  // Row model for the DS Table: `id` is the list index, or '__new' for the add row.
  type Row = { id: number | string; name: string; unit: string; actions: null }
  const isEditing = (r: Row) => (r.id === '__new' ? editing === 'new' : editing === r.id)
  const rows: Row[] = [
    ...vars.map((v, i) => ({ id: i, name: v.name, unit: v.unit, actions: null })),
    ...(editing === 'new' ? [{ id: '__new', name: '', unit: '', actions: null }] : []),
  ]

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Variable',
      render: (r) =>
        isEditing(r) ? (
          <Textfield
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={onKey}
            placeholder="e.g. d97"
            aria-label="Variable name"
            error={duplicate ? 'This variable already exists' : undefined}
            className="h-8"
          />
        ) : (
          <span className="font-medium">{r.name}</span>
        ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (r) =>
        isEditing(r) ? (
          <div className="w-[140px]">
            <Textfield
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              onKeyDown={onKey}
              placeholder="e.g. µm"
              aria-label="Unit"
              className="h-8"
            />
          </div>
        ) : (
          <span className={r.unit ? 'text-text' : 'text-text-muted'}>{r.unit || '—'}</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        isEditing(r) ? (
          <div className="inline-flex gap-1 whitespace-nowrap">
            <Tooltip content="Save">
              <span className="inline-flex">
                <IconButton
                  size="sm"
                  variant="ghost"
                  className="text-accent"
                  onClick={save}
                  disabled={!canSave}
                  aria-label="Save variable"
                  icon={<CheckIcon fontSize="small" />}
                />
              </span>
            </Tooltip>
            <Tooltip content="Cancel">
              <IconButton size="sm" variant="ghost" onClick={cancel} aria-label="Cancel" icon={<CloseIcon fontSize="small" />} />
            </Tooltip>
          </div>
        ) : (
          <div className="inline-flex gap-1 whitespace-nowrap">
            <Tooltip content="Edit">
              <span className="inline-flex">
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(r.id as number)}
                  disabled={editing !== null}
                  aria-label={`Edit ${r.name}`}
                  icon={<EditIcon fontSize="small" />}
                />
              </span>
            </Tooltip>
            <Tooltip content="Delete">
              <span className="inline-flex">
                <IconButton
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => setToDelete(r.id as number)}
                  disabled={editing !== null}
                  aria-label={`Delete ${r.name}`}
                  icon={<DeleteIcon fontSize="small" />}
                />
              </span>
            </Tooltip>
          </div>
        ),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormSectionV2
        title="Result variables"
        action={
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<AddIcon fontSize="small" />}
            onClick={startAdd}
            disabled={editing !== null}
          >
            New variable
          </Button>
        }
      >
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          The variables a batch can set expected results for and measure on the Results tab. Changes apply
          to what batches can pick from now on — values already recorded on a batch are kept.
        </Typography>

        <Table columns={columns} data={rows} density="compact" className="min-w-0 [&_table]:min-w-[420px]" />
        {vars.length === 0 && editing !== 'new' && (
          <p className="px-3 py-5 text-sm text-text-muted">No variables yet.</p>
        )}
      </FormSectionV2>

      <AlertDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={`Delete ${toDelete !== null ? (vars[toDelete]?.name ?? '') : ''}?`}
        description="New batches won't be able to pick this variable. Batches that already use it keep their expected and measured values."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </Box>
  )
}
