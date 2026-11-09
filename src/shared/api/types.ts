// TypeScript mirrors of the REAL Notify / IRIS Cloud `api` contracts (customer
// public API). Field names match the backend's JSON tags exactly — these are the
// names the Performance Tracking must adapt its (invented) mock shapes to.
//
// Source of truth: get-notify/api → models/public/notify_api.gen.go and the
// customer app's src/model + src/types interfaces.

// --- Auth ---------------------------------------------------------------

export interface TokenPair {
  access: string
  refresh: string
}

export interface LoginRequest {
  login: string
  password: string
  recaptchaValue: string
}

/** Decoded (unverified) access-token claims. */
export interface JwtClaims {
  id: string
  'e-mail': string
  first_name: string
  last_name: string
  photo?: string
  is_active: boolean
  language?: string
  phone?: string
  /** Map of organizationId -> role. */
  organizations: Record<string, string>
  features: Array<{
    feature_id: string
    enabled: boolean
    feature: { constant: string }
  }>
  iat?: number
  exp?: number
}

/** Standard backend error body: `{ code, message }`. */
export interface ApiError {
  code?: string
  message?: string
}

// --- Machines -----------------------------------------------------------

export interface MachineStatus {
  value: string
  updated_at?: string
  warning?: boolean
  error?: {
    code: string
    message: string
    is_custom: boolean
    custom_error_id?: string
  } | null
}

export interface MachineMechanicalConfig {
  bead_material?: string
  beads_filling_level?: number
  beads_size_1?: number
  beads_size_2?: number
  grinding_technology?: string
  inner_liner_material?: string
  mill_system?: string
  samba_system?: string
  sieve_size?: number
}

export interface Machine {
  id: string
  name: string
  brand?: string
  other_brand?: string
  /** e.g. NETZSCH_ALPHA_DISCUS */
  type: string
  id_number?: string
  commission_number?: string
  gateway_SN?: string
  gateway_id?: string
  production_line?: string
  organization_id?: string
  organization_name?: string
  enabled_config?: { batch?: boolean; data_exports?: boolean }
  mechanical_config?: MachineMechanicalConfig
  status?: MachineStatus
}

// --- Production metrics (product engagement — NOT OEE) -------------------

export interface ProductionMetricsBatchInfo {
  cancelled?: number
  completed?: number
  grinding_energy?: number
  production_size?: number
  total?: number
}

export interface ProductionMetrics {
  from: string
  to: string
  alarms: number
  alerts: number
  hour_meter?: string
  batches?: ProductionMetricsBatchInfo
}

export interface MachineProductionMetrics {
  last_week: ProductionMetrics
  up_to_today: ProductionMetrics
  last_month: ProductionMetrics
}

// --- Batches ------------------------------------------------------------

export type BatchStatus =
  | 'COMPLETED'
  | 'CONCLUDED'
  | 'CANCELLED'
  | 'IN_OPERATION'
  | 'STOPPED'
  | 'LOADING'
  | 'COMPLETED_BEFORE_TARGET'
  | 'COMPLETED_WITH_TARGET_UPDATES'

export type BatchOrigin = 'IRIS_V3' | 'GATEWAY' | 'MANUAL'

export interface BatchRecordDetails {
  batch_id: string
  id: string
  recipe?: string
  status: BatchStatus | string
  progress: number
  size?: number
  length?: number
  cycles?: number
  max_allowed_temperature?: number
  date: { start: string; end: string }
}

export interface BatchRecordProperty {
  est_energy_consumption?: number
  grinding_energy?: number
  specific_energy?: number
  total_grinding_time?: number
}

export interface BatchRecord {
  created_at: string
  time: string
  origin: BatchOrigin | string
  gateway_id?: string
  machine_id: string
  machine?: Machine
  note?: string
  batch_notes?: BatchNote[]
  target?: { type: string; value: number }
  property?: BatchRecordProperty
  details: BatchRecordDetails
}

/** Summary row as returned inside the paginated batch list. */
export interface BatchSummary {
  id: string
  batch_id: string
  /** machine name (string, not the full object) */
  machine: string
  recipe?: string
  status: BatchStatus | string
  progress: number
  grinding_energy?: number
  origin?: BatchOrigin | string
  start_time?: string
  end_time?: string
}

export interface PaginatedBatches {
  data: BatchSummary[]
  page: number
  total_pages: number
}

export interface BatchNote {
  batch_id: string
  id: string
  title: string
  note: string
  user_id: string
  user_name: string
  user_nickname?: string
  created_at: string
  updated_at?: string
  deleted_at?: string | null
  enabled_edit?: boolean
}

// --- Generic pagination -------------------------------------------------

export interface Paginated<T> {
  data: T[]
  page: number
  total_pages: number
}

// --- Alarms / alerts / errors -------------------------------------------

/** Sensor-threshold alert (iMetricAlert). */
export interface MetricAlert {
  id: string
  machine_name: string
  production_line?: string
  error_code?: string
  alarm_target?: string
  message: string
  created_at: string
  deleted_at?: string | null
}

/** Machine alarm (iMetricAlarm). */
export interface MetricAlarm {
  id: string
  code: string
  machine_id: string
  machine_name: string
  production_line?: string
  message: string
  is_active: boolean
  is_custom: boolean
  resolved: boolean
  time: string
}

/** Machine error (iError). */
export interface MachineError {
  code: string
  custom_error_id?: string
  gateway_id?: string
  is_active: boolean
  is_custom: boolean
  machine_id: string
  message: string
  time: string
}

// --- Filters (v2 resumed lookups) ---------------------------------------
// NOTE: exact shapes to be pinned from api/specification_v2.yaml; typed
// conservatively from the customer app's usage until then.

export interface MachineTuple {
  id: string
  name: string
}

export interface SensorInfo {
  name: string
  label?: string
  unit?: string
}
