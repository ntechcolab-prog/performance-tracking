'use client'

import { ChevronDown, Download, FileText, Sheet as SheetIcon } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { Menu } from '@/src/ds/components/Menu'
import { printElement } from '@/src/shared/lib/exportPdf'
import { exportCsv, exportXlsx, type Sheet } from '@/src/shared/lib/exportData'

// DS export button (PDF / CSV / XLSX). Reuses the exact export helpers from
// src/lib — only the trigger UI is rebuilt on MUI. `sheets`/`title` resolve
// lazily on click so the export always reflects current state.
export default function ExportMenuV2({
  title,
  printId,
  filenameBase,
  sheets,
  disabled = false,
  label = 'Export',
  accent = false,
}: {
  title: string
  printId: string
  filenameBase: string
  sheets: () => Sheet[]
  disabled?: boolean
  label?: string
  accent?: boolean
}) {
  const run = (fn: () => void | Promise<void>) => {
    Promise.resolve(fn()).catch(() => {})
  }

  return (
    <Menu
      align="end"
      trigger={
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          leadingIcon={<Download className="size-4" />}
          className={accent ? 'border-accent text-accent' : 'text-text-muted'}
        >
          {label}
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      }
      items={[
        { label: 'PDF · Print / save', icon: <FileText className="size-4" />, onSelect: () => run(() => printElement(printId, title)) },
        { label: 'CSV', icon: <SheetIcon className="size-4" />, onSelect: () => run(() => exportCsv(filenameBase, sheets()[0])) },
        { label: 'XLSX · Excel', icon: <SheetIcon className="size-4" />, onSelect: () => run(() => exportXlsx(filenameBase, sheets())) },
      ]}
    />
  )
}
