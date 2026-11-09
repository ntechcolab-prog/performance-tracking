'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Search } from 'lucide-react'
import { Card } from '@/src/ds/components/Card'
import { Button } from '@/src/ds/components/Button'
import { Textfield } from '@/src/ds/components/Textfield'
import { Table, type Column } from '@/src/ds/components/Table'
import { Badge } from '@/src/ds/components/Badge'
import { Pagination } from '@/src/ds/components/Pagination'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined'
import { REGISTRY_ROWS, type RegistryRow } from '@/src/shared/data/appData'
import { makeDraft, type BatchForm } from '@/src/shared/data/batchForm'
import { isLiveMode } from '@/src/shared/data/mockData'
import { getLiveBatchRecord, batchRecordToForm } from '@/src/v2/live/liveBatchStore'
import { useLocalStorage } from '@/src/shared/lib/useLocalStorage'
import type { Sheet } from '@/src/shared/lib/exportData'
import { NEW_BATCH, type AppRoute } from '@/src/v2/routes'
import type { AppLocation } from '@/src/v2/useAppLocation'
import BatchEditorV2 from './BatchEditorV2'
import ExportMenuV2 from './ExportMenuV2'
import { withAlpha } from './ui'

// Registry on the Techco.lab DS. Same data pipeline / business logic as the Tailwind v0/v1
// screen (search filter → selection → export, New Batch draft, edit existing);
// only the presentation is rebuilt on MUI. Batch editor with its tabs lives in
// BatchEditorV2.
//
// Which batch (and tab) is open comes from the route — /registry/<id>/<tab>,
// /registry/new for a draft (see src/v2/routes.ts) — so a link reopens exactly
// that view. Opening a row, New Batch, Back and the tabs all navigate.
const COLUMNS = ['Batch ID', 'Recipe', 'Start Date', 'End Date', 'Machine', 'Status']
const TABLE_COLUMNS: Column<RegistryRow>[] = [
  { key: 'id', header: COLUMNS[0], className: 'px-6', render: (r) => <span className="font-medium">{r.id}</span> },
  { key: 'product', header: COLUMNS[1], className: 'px-6' },
  { key: 'start', header: COLUMNS[2], className: 'px-6', render: (r) => <span className="text-text-muted">{r.start}</span> },
  { key: 'end', header: COLUMNS[3], className: 'px-6', render: (r) => <span className="text-text-muted">{r.end}</span> },
  { key: 'line', header: COLUMNS[4], className: 'px-6' },
  { key: 'status', header: COLUMNS[5], className: 'px-6', render: (r) => <StatusBadge status={r.status} /> },
]
const REGISTRY_PRINT_ID = 'registry-batch-log-print-v2'
const PAGE_SIZE = 10

interface Props {
  // v0: only the screens in V0_ALLOWED_SCREENS stay enabled (see shared/versionGate).
  restricted?: boolean
  /** The app's location (screen = 'registry'): batch and tab open in the editor. */
  route: AppRoute
  navigate: AppLocation['navigate']
}

export default function RegistryV2({ restricted = false, route, navigate }: Props) {
  const [rows, setRows] = useLocalStorage<RegistryRow[]>('dr-registry-rows', REGISTRY_ROWS)
  const [seq, setSeq] = useLocalStorage<number>('dr-batch-seq', 274)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.id, r.product, r.line, r.status, r.start, r.end].some((v) => v.toLowerCase().includes(q)),
    )
  }, [rows, query])

  // Paginated view. The page index is clamped instead of reset so that deleting
  // or filtering rows away can never leave the table showing an empty page.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  useEffect(() => {
    setPage(0)
  }, [query])

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))
  const someFilteredSelected = filtered.some((r) => selected.has(r.id))
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) filtered.forEach((r) => next.delete(r.id))
      else filtered.forEach((r) => next.add(r.id))
      return next
    })

  const buildSheets = (): Sheet[] => {
    const picked = rows.filter((r) => selected.has(r.id))
    return [
      {
        name: 'Selected Batches',
        rows: [COLUMNS, ...picked.map((r) => [r.id, r.product, r.start, r.end, r.line, r.status])],
      },
    ]
  }

  const newBatch = () => navigate({ screen: 'registry', batchId: NEW_BATCH })
  const editExisting = (row: RegistryRow) => navigate({ screen: 'registry', batchId: row.id })

  // The form the editor opens with, for the batch id in the URL. Null when no
  // row has that id (a stale link, a batch from another session).
  const formFor = (id: string): BatchForm | null => {
    if (id === NEW_BATCH) return makeDraft(seq)
    const row = rows.find((r) => r.id === id)
    if (!row) return null
    if (isLiveMode()) {
      const rec = getLiveBatchRecord(row.id)
      return rec ? batchRecordToForm(rec) : { ...makeDraft(0), id: row.id }
    }
    // Mock: seed the editor with the row's own status and period so the Resume
    // matches the table (the rest of the draft is sample data).
    const parse = (v: string) => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2}:\d{2})/.exec(v)
      return m ? { date: `${m[3]}-${m[2]}-${m[1]}`, time: m[4] } : null
    }
    const draft = makeDraft(0)
    const st = parse(row.start)
    const en = parse(row.end)
    return {
      ...draft,
      id: row.id,
      status: row.status,
      period: st && en ? { startDate: st.date, startTime: st.time, endDate: en.date, endTime: en.time } : draft.period,
    }
  }
  // Resolved once per batch id: /registry/new takes its id from the sequence,
  // which moves on when the batch is saved — the open draft must not follow.
  const initial = useOncePerKey(route.batchId, () => (route.batchId ? formFor(route.batchId) : null))

  // Unknown id → back to the list.
  const missing = route.batchId != null && initial == null
  useEffect(() => {
    if (missing) navigate({ screen: 'registry' }, { replace: true })
  }, [missing, navigate])

  // Every card Save lands here. An existing row keeps its recipe, machine and
  // source; only the period (in the table's DD/MM/YYYY - HH:MM:SS format) and
  // an edited status change.
  const onSave = (formData: BatchForm) => {
    const fmt = (date: string, time: string) => {
      const [y, m, d] = date.split('-')
      return date ? `${d}/${m}/${y} - ${time.length === 5 ? `${time}:00` : time}` : ''
    }
    const start = fmt(formData.period.startDate, formData.period.startTime)
    const end = fmt(formData.period.endDate, formData.period.endTime)
    const status = formData.status as RegistryRow['status'] | undefined
    setRows((prev) => {
      const old = prev.find((r) => r.id === formData.id)
      if (old) {
        return prev.map((r) => (r.id === old.id ? { ...r, start: start || r.start, end: end || r.end, status: status ?? r.status } : r))
      }
      const newRow: RegistryRow = {
        id: formData.id,
        product: formData.product.productType.split(' - ')[1] ?? formData.product.productType,
        start,
        end,
        line: 'Zeta 10',
        status: status ?? 'In progress',
        source: 'Manual',
      }
      return [newRow, ...prev]
    })
    if (formData.id.startsWith('BA-')) setSeq((s) => s + 1)
    // The draft is a row now: its URL becomes the batch's own (same tab).
    if (route.batchId === NEW_BATCH) navigate({ ...route, batchId: formData.id }, { replace: true })
  }

  if (route.batchId) {
    if (!initial) return null // redirecting to the list
    return (
      <BatchEditorV2
        initial={initial}
        tab={route.tab}
        onTabChange={(tab) => navigate({ ...route, tab }, { replace: true })}
        onBack={() => navigate({ screen: 'registry' })}
        onSave={onSave}
        restricted={restricted}
      />
    )
  }

  return (
    <Box sx={{ maxWidth: '80rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: (t) => withAlpha(t.palette.primary.main, 0.12), color: 'primary.main' }}>
          <ReceiptLongIcon fontSize="small" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Registry</Typography>
      </Box>

      <Card className="overflow-visible p-6">
        <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Textfield
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for …"
              aria-label="Search batches"
              leadingIcon={<Search className="size-4" />}
              className="h-8 w-56"
            />
            {!restricted && (
              <ExportMenuV2
                title="Registry · Selected Batches"
                printId={REGISTRY_PRINT_ID}
                filenameBase="registry-selected-batches"
                sheets={buildSheets}
                disabled={selected.size === 0}
                label={selected.size > 0 ? `Export (${selected.size})` : 'Export'}
                accent
              />
            )}
            <Button variant="primary" size="sm" onClick={newBatch}>New Batch</Button>
          </Box>
        </Box>

        {/* Row click opens the batch; "select all" covers every filtered batch
            (not just this page), so the header checkbox is delegated. */}
        <div id={REGISTRY_PRINT_ID}>
          <Table
            className="[&_table]:min-w-[56.75rem] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
            columns={TABLE_COLUMNS}
            data={visible}
            onRowClick={editExisting}
            selectable={!restricted}
            selectedIds={[...selected]}
            onSelectionChange={(ids) => setSelected(new Set(ids.map(String)))}
            onSelectAll={toggleAll}
            selectAllState={allFilteredSelected ? 'all' : someFilteredSelected ? 'some' : 'none'}
            empty={<div className="py-7 text-center">No batches match “{query}”.</div>}
          />
        </div>

        {filtered.length > PAGE_SIZE && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, '@media print': { display: 'none' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Showing {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + visible.length} of {filtered.length} batches
            </Typography>
            <Pagination page={current + 1} pageCount={pageCount} onPageChange={(p) => setPage(p - 1)} />
          </Box>
        )}
      </Card>
    </Box>
  )
}

// Runs `make` again only when `key` changes — a lazy initializer per key.
function useOncePerKey<K, T>(key: K, make: () => T): T {
  const ref = useRef<{ key: K; value: T } | null>(null)
  if (!ref.current || ref.current.key !== key) ref.current = { key, value: make() }
  return ref.current.value
}

function StatusBadge({ status }: { status: RegistryRow['status'] }) {
  const variant = status === 'Completed' ? 'success' : status === 'Cancelled' ? 'danger' : 'warning'
  return <Badge dot size="sm" variant={variant}>{status}</Badge>
}
