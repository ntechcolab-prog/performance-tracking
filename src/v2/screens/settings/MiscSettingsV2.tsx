'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Select } from '@/src/ds/components/Select'
import { Textfield } from '@/src/ds/components/Textfield'
import { useLocalStorage } from '@/src/shared/lib/useLocalStorage'
import { FormSectionV2, FieldV2 } from './settingsUi'

// Same persisted model + localStorage keys as the Tailwind MiscSettings, so v0/v1
// and v2 stay in sync. Only the presentation is rebuilt on MUI. The data
// constants are re-declared here (they aren't exported from lib) — the business
// logic (useLocalStorage + the shared storage keys) is reused verbatim.

// ── General ──────────────────────────────────────────────────────────────────

const COUNTRIES = ['Germany', 'Brazil', 'USA', 'China', 'India']

const CARBON_FACTOR_BY_COUNTRY: Record<string, number> = {
  Germany: 0.38,
  Brazil: 0.07,
  USA: 0.39,
  China: 0.58,
  India: 0.71,
}

interface General {
  country: string
  carbonFactor: number
}
const GENERAL_DEFAULTS: General = {
  country: 'Germany',
  carbonFactor: CARBON_FACTOR_BY_COUNTRY.Germany,
}

export function GeneralSettingsV2() {
  const [s, set] = useLocalStorage<General>('dr-settings-general', GENERAL_DEFAULTS)
  const country = s.country ?? GENERAL_DEFAULTS.country
  const carbonFactor = s.carbonFactor ?? GENERAL_DEFAULTS.carbonFactor
  const setCountry = (c: string) =>
    set((p) => ({ ...p, country: c, carbonFactor: CARBON_FACTOR_BY_COUNTRY[c] ?? p.carbonFactor }))
  const setFactor = (n: number) => set((p) => ({ ...p, carbonFactor: Math.max(0, n) }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormSectionV2 title="Region & emissions">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <FieldV2 label="Country">
            <Select
              options={COUNTRIES.map((c) => ({ label: c, value: c }))}
              value={country}
              onChange={setCountry}
            />
          </FieldV2>
          <FieldV2 label="Carbon footprint reference factor">
            <Textfield
              type="number"
              min={0}
              step={0.01}
              value={carbonFactor}
              onChange={(e) => setFactor(e.target.value === '' ? 0 : Number(e.target.value))}
              trailingIcon={<span className="text-sm text-text-muted">kg CO₂e/kWh</span>}
              className="pr-28"
            />
          </FieldV2>
        </Box>
        <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>
          Used to estimate CO₂ emissions from energy consumption (kg CO₂e per kWh of electricity).
          Choosing a country prefills a typical grid value — adjust it to match your supplier or region.
        </Typography>
      </FormSectionV2>
    </Box>
  )
}

// ── Data Export ───────────────────────────────────────────────────────────────

interface DataExport {
  schedule: 'Off' | 'Daily' | 'Weekly' | 'Monthly'
  content: 'Summary' | 'Full (all complete data)'
  format: 'PDF' | 'CSV' | 'XLSX'
}
const EXPORT_DEFAULTS: DataExport = {
  schedule: 'Off',
  content: 'Summary',
  format: 'XLSX',
}

export function DataExportSettingsV2() {
  const [s, set] = useLocalStorage<DataExport>('dr-settings-export', EXPORT_DEFAULTS)
  const f = <K extends keyof DataExport>(k: K, v: DataExport[K]) => set((p) => ({ ...p, [k]: v }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormSectionV2 title="Scheduled export">
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Automatically generate a recurring export of your batches.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          <FieldV2 label="Frequency">
            <Select
              options={(['Off', 'Daily', 'Weekly', 'Monthly'] as const).map((o) => ({ label: o, value: o }))}
              value={s.schedule}
              onChange={(v) => f('schedule', v as DataExport['schedule'])}
            />
          </FieldV2>
          <FieldV2 label="Report content">
            <Select
              options={(['Summary', 'Full (all complete data)'] as const).map((o) => ({ label: o, value: o }))}
              value={s.content}
              onChange={(v) => f('content', v as DataExport['content'])}
            />
          </FieldV2>
          <FieldV2 label="Format">
            <Select
              options={(['PDF', 'CSV', 'XLSX'] as const).map((o) => ({ label: o, value: o }))}
              value={s.format}
              onChange={(v) => f('format', v as DataExport['format'])}
            />
          </FieldV2>
        </Box>
        <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Summary</Box> delivers
          headline KPIs and totals per batch;{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Full</Box> includes every
          recorded field for each completed batch. The export covers your batches only — it&apos;s sent to
          the email on your logged-in account.
        </Typography>
      </FormSectionV2>
    </Box>
  )
}
