export { DataGrid } from './DataGrid'
// `RowId` is intentionally not re-exported here — it collides with Table's
// `RowId` in the package barrel. Import it from Table, or use `string | number`.
export type { DataGridProps, DataGridColumn } from './DataGrid'
