// OEE (Overall Equipment Effectiveness) computed at runtime from REAL Notify
// data.  OEE = Availability × Performance × Quality.
//
// Verified feasible against the backend contracts:
//   Quality      = good ÷ total          → production-metrics.batches (direct)
//   Availability = run time ÷ planned     → run time from hour_meter / grinding
//                                           time; planned from the shift plan
//   Performance  = actual rate ÷ ideal    → actual from batch size ÷ grinding
//                                           time; ideal from the recipe target
//
// The only inputs that are NOT machine data are the business TARGETS (planned
// production time and per-recipe ideal rate). Those are client-side config the
// Performance Tracking already owns (the shift plan works this way) — they are passed in
// as explicit parameters here, never invented.
//
// All ratios are returned in 0..1. Use `toPct` for display.

import type { BatchRecordProperty, ProductionMetrics } from '../api/types'

export interface OeeResult {
  availability: number // 0..1
  performance: number // 0..1
  quality: number // 0..1
  oee: number // 0..1
}

export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)
export const toPct = (ratio: number): number => Math.round(clamp01(ratio) * 1000) / 10

// --- Quality: good ÷ total, straight from production-metrics -------------

export function quality(good: number, total: number): number {
  return total > 0 ? clamp01(good / total) : 0
}

/** Quality from a production-metrics window: completed ÷ total (total falls back
 *  to completed + cancelled). */
export function qualityFromProduction(pm: ProductionMetrics | undefined): number {
  const b = pm?.batches
  if (!b) return 0
  const completed = b.completed ?? 0
  const total = b.total ?? completed + (b.cancelled ?? 0)
  return quality(completed, total)
}

// --- Availability: run time ÷ planned time ------------------------------

export function availability(runTimeHours: number, plannedTimeHours: number): number {
  return plannedTimeHours > 0 ? clamp01(runTimeHours / plannedTimeHours) : 0
}

/** Parse the backend `hour_meter` (a string) into hours. Accepts a plain number
 *  ("123.5") or a clock string ("HH:MM:SS" / "HH:MM"). Returns 0 if unparseable.
 *  NOTE: the exact hour_meter format is not documented — confirm and adjust. */
export function parseHourMeter(hourMeter?: string): number {
  if (!hourMeter) return 0
  const trimmed = hourMeter.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  const parts = trimmed.split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) return 0
  const [h = 0, m = 0, s = 0] = parts
  return h + m / 60 + s / 3600
}

// --- Performance: actual rate ÷ ideal rate ------------------------------

export function performance(actualRate: number, idealRate: number): number {
  return idealRate > 0 ? clamp01(actualRate / idealRate) : 0
}

/** Actual throughput (ton/h) of a batch from produced size and grinding time. */
export function batchActualRate(sizeTon: number, grindingTimeHours: number): number {
  return grindingTimeHours > 0 ? sizeTon / grindingTimeHours : 0
}

/** Grinding time (hours) from a batch property. `total_grinding_time` unit is not
 *  yet pinned — pass the divisor that converts it to hours (default: minutes). */
export function grindingTimeHours(property: BatchRecordProperty | undefined, perHour = 60): number {
  const t = property?.total_grinding_time
  return t && perHour > 0 ? t / perHour : 0
}

// --- Roll-up ------------------------------------------------------------

export function oee(availabilityRatio: number, performanceRatio: number, qualityRatio: number): number {
  return clamp01(availabilityRatio * performanceRatio * qualityRatio)
}

export function computeOee(input: {
  runTimeHours: number
  plannedTimeHours: number
  actualRate: number
  idealRate: number
  good: number
  total: number
}): OeeResult {
  const a = availability(input.runTimeHours, input.plannedTimeHours)
  const p = performance(input.actualRate, input.idealRate)
  const q = quality(input.good, input.total)
  return { availability: a, performance: p, quality: q, oee: oee(a, p, q) }
}
