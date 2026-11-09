// Adapters: REAL Notify contracts → the shapes the (currently mock-driven) UI
// expects. This is where the backend's field names are reconciled to the Batch
// Book's invented ones. Mappings are best-effort and HONEST: fields with no real
// counterpart are set to 0 / '' and marked, never fabricated.

import type { Batch, MachineInfo } from '../data/mockData'
import type { BatchRecord, BatchSummary, Machine, ProductionMetrics } from './types'
import { batchActualRate, computeOee, grindingTimeHours, parseHourMeter, quality, type OeeResult } from '../lib/oee'

const titleCase = (s: string): string =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

// --- Machines -----------------------------------------------------------

const MILL_FAMILIES = ['Zeta', 'Omega', 'Alpha', 'Neos', 'Discus', 'Kappa', 'Gamma', 'MasterMix']

function familyFromType(type: string): string {
  const upper = type.toUpperCase()
  const hit = MILL_FAMILIES.find((f) => upper.includes(f.toUpperCase()))
  return hit ?? titleCase(type.replace(/^NETZSCH_/, '').replace(/_/g, ' '))
}

export function machineToMachineInfo(m: Machine): MachineInfo {
  const prettyType = titleCase((m.type ?? '').replace(/^NETZSCH_/, '').replace(/_/g, ' '))
  return {
    name: m.name,
    line: m.production_line ?? '',
    family: familyFromType(m.type ?? ''),
    model: m.brand ?? prettyType,
  }
}

// --- Batch status -------------------------------------------------------

const STATUS_DISPLAY: Record<string, string> = {
  COMPLETED: 'Completed',
  CONCLUDED: 'Completed',
  COMPLETED_BEFORE_TARGET: 'Completed before target',
  COMPLETED_WITH_TARGET_UPDATES: 'Completed with target updates',
  IN_OPERATION: 'In operation',
  LOADING: 'In operation',
  STOPPED: 'Cancelled',
  CANCELLED: 'Cancelled',
}

export function statusToDisplay(status: string): string {
  return STATUS_DISPLAY[status] ?? titleCase(status.replace(/_/g, ' '))
}

// --- Batches ------------------------------------------------------------

function dateParts(iso?: string): Pick<Batch, 'date' | 'day' | 'month' | 'year'> {
  const d = iso ? new Date(iso) : new Date(NaN)
  const valid = !Number.isNaN(d.getTime())
  return {
    date: d,
    day: valid ? d.getDate() : 0,
    month: valid ? d.getMonth() : 0,
    year: valid ? d.getFullYear() : 0,
  }
}

/** Clock time of an API timestamp, 'HH:mm'. Empty when absent or unparseable. */
function clockTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Best-effort map of a list-row summary. Summary rows carry no mass / grinding
 *  time / cooling / co2 — those are 0 here; use the full record for detail. */
export function batchSummaryToBatch(s: BatchSummary): Batch {
  return {
    id: s.batch_id || s.id,
    ...dateParts(s.start_time),
    machine: s.machine,
    recipe: s.recipe ?? '',
    productionLine: '',
    mass: 0,
    energy: s.grinding_energy ?? 0,
    cooling: 0,
    passes: 0,
    cycles: 0,
    startTime: clockTime(s.start_time),
    endTime: clockTime(s.end_time),
    grindMin: 0,
    setupMin: 0,
    idleMin: 0,
    alarmMin: 0,
    status: statusToDisplay(String(s.status)),
    interruption: '',
    co2: 0,
  }
}

/** Full record → Batch. `total_grinding_time` unit is assumed minutes (see
 *  oee.grindingTimeHours); cooling / co2 / setup / idle / alarm have no backend
 *  counterpart and stay 0. */
export function batchRecordToBatch(r: BatchRecord): Batch {
  const grindHours = grindingTimeHours(r.property)
  return {
    id: r.details.batch_id,
    ...dateParts(r.details.date?.start ?? r.created_at),
    machine: r.machine?.name ?? r.machine_id,
    recipe: r.details.recipe ?? '',
    productionLine: r.machine?.production_line ?? '',
    mass: r.details.size ?? 0,
    energy: r.property?.grinding_energy ?? 0,
    cooling: 0,
    // The backend reports cycles; passes has no counterpart yet.
    passes: 0,
    cycles: r.details.cycles ?? 0,
    startTime: clockTime(r.details.date?.start),
    endTime: clockTime(r.details.date?.end),
    grindMin: Math.round(grindHours * 60),
    setupMin: 0,
    idleMin: 0,
    alarmMin: 0,
    status: statusToDisplay(String(r.details.status)),
    interruption: '',
    co2: 0,
  }
}

// --- OEE from real production metrics -----------------------------------

/** Compute OEE for a production-metrics window using real machine data plus the
 *  business targets the Performance Tracking owns client-side (planned time, ideal rate).
 *  actualRate defaults to produced size ÷ run time when not supplied. */
export function oeeFromProduction(
  pm: ProductionMetrics,
  targets: { plannedTimeHours: number; idealRate: number; actualRate?: number },
): OeeResult {
  const runTimeHours = parseHourMeter(pm.hour_meter)
  const producedSize = pm.batches?.production_size ?? 0
  const actualRate = targets.actualRate ?? batchActualRate(producedSize, runTimeHours)
  const completed = pm.batches?.completed ?? 0
  const total = pm.batches?.total ?? completed + (pm.batches?.cancelled ?? 0)
  return computeOee({
    runTimeHours,
    plannedTimeHours: targets.plannedTimeHours,
    actualRate,
    idealRate: targets.idealRate,
    good: completed,
    total,
  })
}

export { quality }
