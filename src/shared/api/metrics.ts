// Sensor metrics — get-notify/api customer surface. These feed the process
// telemetry the Performance Tracking currently fakes (mill speed, temps, flows, pressures).
//
//   GET /v1/metrics/last?machine_id=&metrics=
//   GET /v1/metrics/history/chart-data?machine_id=&from=&to=&metrics=
//   GET /v1/metrics/metric-chart-data?machine_id=&from=&to=&simple_metric=
//   GET /v1/metrics/machine-status?id=&from=&to=
//   GET /v2/machine/{id}/metrics/sensor-history | status-history | sensor-averages
//   GET /v1/batch/{id}/history?metrics=&from=&to=
//
// Chart-data payload shapes are not yet pinned (they must come from
// api/specification.yaml); functions are generic so callers type the response
// explicitly once the shape is confirmed — we do NOT invent field names here.

import { request } from './client'

export interface MetricsWindow {
  from: string
  to: string
}

// --- Sensor list + latest values (typed) --------------------------------

export interface MachineSensor {
  type: string
  is_custom: boolean
  is_static: boolean
}

export interface LastMetric {
  name: string
  type: string
  units?: string
  status?: string
  is_custom?: boolean
  custom_sensor_id?: number
  values: { time: string; value: number }[]
}

/** The machine's sensor list: `{ machine_id, sensors: [{ type, ... }] }`. */
export function machineSensorList(machineId: string): Promise<{ machine_id: string; sensors: MachineSensor[] }> {
  return request(`/v2/filters/machine/${machineId}/sensors`)
}

/** Latest values. `metricParams` are `"<type>,<unit>"` strings (see sensorUnits).
 *  Only sensors that currently have a value are returned. */
export function latestSensorValues(machineId: string, metricParams: string[]): Promise<LastMetric[]> {
  return request<LastMetric[]>('/v1/metrics/last', { query: { machine_id: machineId, metrics: metricParams } })
}

export interface ChartDataPoint {
  time: number // epoch ms
  activeStatus?: string
  warning?: number
  labels: { labelName: string; value: number; type: string }[]
}

/** Time series for a set of sensors (wide format: each point carries every
 *  requested sensor's value in `labels`). */
export function sensorHistoryChart(
  machineId: string,
  metricParams: string[],
  window: MetricsWindow,
): Promise<{ chartData: ChartDataPoint[] }> {
  return request('/v1/metrics/history/chart-data', {
    query: { machine_id: machineId, metrics: metricParams, from: window.from, to: window.to },
  })
}

export function latestMetrics<T = unknown>(machineId: string, metrics: string[]): Promise<T> {
  return request<T>('/v1/metrics/last', { query: { machine_id: machineId, metrics } })
}

export function metricsHistoryChartData<T = unknown>(machineId: string, metrics: string[], window: MetricsWindow): Promise<T> {
  return request<T>('/v1/metrics/history/chart-data', {
    query: { machine_id: machineId, metrics, from: window.from, to: window.to },
  })
}

export function metricChartData<T = unknown>(machineId: string, simpleMetric: string, window: MetricsWindow): Promise<T> {
  return request<T>('/v1/metrics/metric-chart-data', {
    query: { machine_id: machineId, simple_metric: simpleMetric, from: window.from, to: window.to },
  })
}

export function machineStatusHistory<T = unknown>(machineId: string, window: MetricsWindow): Promise<T> {
  return request<T>('/v1/metrics/machine-status', { query: { id: machineId, from: window.from, to: window.to } })
}

// --- v2 machine-scoped metrics ------------------------------------------

export function sensorHistory<T = unknown>(machineId: string, params: Record<string, string | number | string[]>): Promise<T> {
  return request<T>(`/v2/machine/${machineId}/metrics/sensor-history`, { query: params })
}

export function sensorAverages<T = unknown>(machineId: string, params: Record<string, string | number | string[]>): Promise<T> {
  return request<T>(`/v2/machine/${machineId}/metrics/sensor-averages`, { query: params })
}

export function batchMetricsHistory<T = unknown>(batchId: string, metrics: string[], window: MetricsWindow): Promise<T> {
  return request<T>(`/v1/batch/${batchId}/history`, { query: { metrics, from: window.from, to: window.to } })
}
