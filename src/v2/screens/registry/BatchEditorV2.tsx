'use client'

import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabList, Tab } from '@/src/ds/components/Tabs'
import { Badge } from '@/src/ds/components/Badge'
import { IconButton } from '@/src/ds/components/IconButton'
import { Tooltip } from '@/src/ds/components/Tooltip'
import type { BatchForm } from '@/src/shared/data/batchForm'
import { useLocalStorage } from '@/src/shared/lib/useLocalStorage'
import type { Sheet } from '@/src/shared/lib/exportData'
import ExportMenuV2 from './ExportMenuV2'
import ResumeTab from './tabs/ResumeTab'
import ProductTab from './tabs/ProductTab'
import MachineFormTab from './tabs/MachineFormTab'
import ResultsTab from './tabs/ResultsTab'
import RemarksTab from './tabs/RemarksTab'
import LogsTab from './tabs/LogsTab'
import ReportsTab from './tabs/ReportsTab'
import { useProductionMonitoring } from '@/src/shared/lib/productionMonitoring'
import { gatedEditorSteps } from '@/src/shared/versionGate'
import { richTextToPlain } from '@/src/v2/components/RichTextField'
import { setLeaveGuard } from '@/src/v2/leaveGuard'
import { EDITOR_TABS, type EditorTab } from '@/src/v2/routes'
import { CardEditProvider, UnsavedDialog, type CardEditApi } from './cardEdit'

const EDITOR_PRINT_ID = 'batch-editor-print-v2'
// The tabs (no Period step: start/end are edited in Resume → Batch Status,
// NOTI-6052). They are also URL segments — /registry/<id>/<tab> — so the list
// lives in routes.ts.
const STEPS = EDITOR_TABS
type Step = EditorTab

interface Props {
  initial: BatchForm
  /** Tab named in the URL; missing, unknown or gated → Resume. */
  tab?: Step
  /** The user picked a tab: the caller moves the URL, which comes back as `tab`. */
  onTabChange: (tab: Step) => void
  onBack: () => void
  onSave: (form: BatchForm) => void
  // v0: only the tabs in V0_ALLOWED_EDITOR_STEPS stay enabled (see shared/versionGate).
  restricted?: boolean
}

export default function BatchEditorV2({ initial, tab, onTabChange, onBack, onSave, restricted = false }: Props) {
  const disabledSteps: Step[] = gatedEditorSteps(STEPS, restricted)
  const [form, setForm] = useLocalStorage<BatchForm>(`dr-batch-form-${initial.id}`, initial)
  const rawStep: Step = tab && !disabledSteps.includes(tab) ? tab : 'Resume'
  const [saved, setSaved] = useState(false)

  const pmOn = useProductionMonitoring()
  const visibleSteps = STEPS.filter((s) => pmOn || s !== 'Remarks')
  const step: Step = !pmOn && rawStep === 'Remarks' ? 'Resume' : rawStep

  // Card editing: every card is read-only until its Edit button is pressed. The
  // open card edits a draft copy of the whole form; Save commits it, Discard
  // drops it. Leaving (tab, Back, sidebar, reload) with a dirty draft asks first.
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<BatchForm | null>(null)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const view = draft ?? form
  const dirty = draft != null && JSON.stringify(draft) !== JSON.stringify(form)

  // Refs so the callbacks below always see the latest values, even when they run
  // right after a commit inside the same event (before React re-renders).
  const formRef = useRef(form)
  formRef.current = form
  const draftRef = useRef(draft)
  draftRef.current = draft
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  // Writes from the open card go to the draft; with no card open nothing changes.
  const update = <K extends keyof BatchForm>(key: K, val: BatchForm[K]) =>
    setDraft((d) => (d ? { ...d, [key]: val } : d))

  const close = () => {
    setEditing(null)
    setDraft(null)
  }

  const commit = () => {
    const d = draftRef.current
    if (d) {
      formRef.current = d
      setForm(d)
      onSave(d)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
    }
    close()
  }

  // Run `proceed` now, or — if the open card has unsaved changes — after the
  // user picks Save or Discard in the dialog.
  const ask = (proceed: () => void) => {
    if (!dirtyRef.current) {
      close()
      proceed()
      return
    }
    setPendingLeave(() => proceed)
  }

  const cardEdit: CardEditApi = {
    editing,
    dirty,
    start: (cardId) => {
      if (editing === cardId) return
      ask(() => {
        setEditing(cardId)
        setDraft(formRef.current)
      })
    },
    save: commit,
    discard: close,
  }

  // Sidebar navigation (AppV2) goes through the same question.
  useEffect(() => {
    setLeaveGuard((proceed) => {
      if (!dirtyRef.current) return false
      setPendingLeave(() => proceed)
      return true
    })
    return () => setLeaveGuard(null)
  }, [])

  // Reload / closing the tab: the browser's own "leave site?" prompt.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const resolveLeave = (keep: boolean) => {
    const proceed = pendingLeave
    setPendingLeave(null)
    if (keep) commit()
    else close()
    proceed?.()
  }

  const buildSheets = (): Sheet[] => [
    {
      name: 'Batch',
      rows: [
        ['Field', 'Value'],
        ['Batch ID', form.id],
        ['Version', form.version],
        ['Product information', richTextToPlain(form.product.details)],
        ['Start', `${form.period.startDate} ${form.period.startTime}`],
        ['End', `${form.period.endDate} ${form.period.endTime}`],
        ['Machine', form.machine.name],
        ['Machine type', form.machine.machineType],
      ],
    },
    {
      name: 'Results',
      rows: [
        ['Date', 'Time', ...form.results.variables],
        ...form.results.rows.map((r) => [r.date, r.time, ...form.results.variables.map((v) => r.values[v] ?? '')]),
      ],
    },
    {
      name: 'Notes',
      rows: [['Date', 'Time', 'Comment'], ...form.remarks.notes.map((n) => [n.date, n.time, n.comment])],
    },
  ]

  return (
    <Box sx={{ maxWidth: '75rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
      {/* header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip content="Back to Registry">
            <IconButton
              variant="secondary"
              onClick={() => ask(onBack)}
              aria-label="Back to Registry"
              className="text-accent"
              icon={<ArrowLeft className="size-5" />}
            />
          </Tooltip>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{form.id}</Typography>
        </Box>
        {/* No version and no global Save/Edit: each card has its own Edit (NOTI-6052). */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {saved && <Typography variant="caption" role="status" sx={{ color: 'success.main', fontWeight: 500 }}>Saved ✓</Typography>}
          <ExportMenuV2 title={`Batch ${form.id}`} printId={EDITOR_PRINT_ID} filenameBase={`batch-${form.id}`} sheets={buildSheets} />
        </Box>
      </Box>

      {/* step tabs */}
      <Tabs
        value={step}
        onValueChange={(v) => { const t = v as Step; if (!disabledSteps.includes(t) && t !== step) ask(() => onTabChange(t)) }}
      >
        <TabList aria-label="Batch sections" className="flex-wrap">
          {visibleSteps.map((s) => {
            const disabled = disabledSteps.includes(s)
            return (
              <Tab key={s} value={s} disabled={disabled} className="shrink-0 whitespace-nowrap">
                {s}
                {disabled && <Badge size="sm" className="ml-1.5">soon</Badge>}
              </Tab>
            )
          })}
        </TabList>
      </Tabs>

      <CardEditProvider value={cardEdit}>
        <Box id={EDITOR_PRINT_ID}>
          {step === 'Resume' && <ResumeTab form={view} onChange={(v) => setDraft((d) => (d ? v : d))} />}
          {step === 'Product' && <ProductTab
              value={view.product}
              onChange={(v) => update('product', v)}
              results={view.results}
              onResultsChange={(v) => update('results', v)}
            />}
          {step === 'Machine' && <MachineFormTab value={view.machine} onChange={(v) => update('machine', v)} />}
          {step === 'Results' && <ResultsTab value={view.results} onChange={(v) => update('results', v)} />}
          {step === 'Remarks' && pmOn && <RemarksTab value={view.remarks} onChange={(v) => update('remarks', v)} results={view.results} />}
          {step === 'Details' && <LogsTab />}
          {/* Reports are actions (create a report), not a form — saved right away. */}
          {step === 'Reports' && <ReportsTab value={form.reports} onChange={(v) => {
              const next = { ...form, reports: v }
              setForm(next)
              onSave(next)
            }} />}
        </Box>
      </CardEditProvider>

      <UnsavedDialog
        open={pendingLeave != null}
        onSave={() => resolveLeave(true)}
        onDiscard={() => resolveLeave(false)}
        onClose={() => setPendingLeave(null)}
      />
    </Box>
  )
}
