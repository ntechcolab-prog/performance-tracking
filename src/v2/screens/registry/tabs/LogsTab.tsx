'use client'

import { Table, type Column } from '@/src/ds/components/Table'
import { Badge } from '@/src/ds/components/Badge'
import { SectionCard } from '../ui'

interface LogEntry { at: string; user: string; action: string; detail: string }

const LOGS: LogEntry[] = [
  { at: '19/04/2026 13:48', user: 'G. Oliveira', action: 'Updated', detail: 'Conclusion text edited' },
  { at: '19/04/2026 13:45', user: 'G. Oliveira', action: 'Added', detail: 'Result row d10/d50/d90 at 11:45' },
  { at: '19/04/2026 11:20', user: 'M. Costa', action: 'Changed', detail: 'Process Mode: Single Pass → Recirculation' },
  { at: '19/04/2026 10:15', user: 'M. Costa', action: 'Created', detail: 'Batch BA-0274 created (version 1.0)' },
]

const variant = (a: string): 'accent' | 'warning' | 'neutral' =>
  a === 'Created' ? 'accent' : a === 'Changed' ? 'warning' : 'neutral'

type LogRow = LogEntry & { id: number }

const COLUMNS: Column<LogRow>[] = [
  { key: 'at', header: 'Date / Time', render: (l) => <span className="text-text-muted tabular-nums">{l.at}</span> },
  { key: 'user', header: 'User' },
  { key: 'action', header: 'Action', render: (l) => <Badge size="sm" variant={variant(l.action)}>{l.action}</Badge> },
  { key: 'detail', header: 'Detail' },
]

export default function LogsTab() {
  return (
    <SectionCard title="Changelog">
      <Table density="compact" columns={COLUMNS} data={LOGS.map((l, i) => ({ ...l, id: i }))} />
    </SectionCard>
  )
}
