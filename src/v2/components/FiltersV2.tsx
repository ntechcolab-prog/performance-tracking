'use client'

import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Button } from '@/src/ds/components/Button'
import { Combobox } from '@/src/ds/components/Combobox'
import { Select } from '@/src/ds/components/Select'
import { SegmentedControl } from '@/src/ds/components/SegmentedControl'
import { MACHINES, RECIPES, MONTHS } from '@/src/shared/data/mockData'
import { buildWeeks, weekLabel } from '@/src/shared/lib/weeks'

export type Period = 'monthly' | 'weekly'

interface FiltersV2Props {
  machines: string[]
  recipes: string[]
  setMachines: (next: string[]) => void
  setRecipes: (next: string[]) => void
  period: Period
  setPeriod: (p: Period) => void
  monthKey: string
  setMonthKey: (key: string) => void
  year: number
  month: number
  weekIdx: number
  setWeekIdx: (i: number) => void
  onClear: () => void
  actions?: ReactNode
}

function MultiSelect({
  label, options, selected, onChange,
}: { label: string; options: readonly string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  return (
    <div className="relative">
      <Combobox
        multiple
        label={label}
        placeholder={selected.length ? '' : 'All'}
        options={options.map((o) => ({ label: o, value: o }))}
        value={selected}
        onChange={onChange}
        hint={`${selected.length} of ${options.length} selected`}
      />
      {/* "Select all" toggles everything; "Clear all" when every option is already picked. */}
      <Button variant="ghost" size="sm" className="absolute right-0 top-[-6px] h-7 px-2 text-xs"
        onClick={() => onChange(allSelected ? [] : [...options])}>
        {allSelected ? 'Clear all' : 'Select all'}
      </Button>
    </div>
  )
}

export default function FiltersV2({
  machines, recipes, setMachines, setRecipes,
  period, setPeriod, monthKey, setMonthKey, year, month, weekIdx, setWeekIdx, onClear, actions,
}: FiltersV2Props) {
  const weeks = buildWeeks(year, month)
  const safeWeek = Math.min(weekIdx, weeks.length - 1)

  return (
    <Box sx={{ px: 3, py: 2.5 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.primary' }}>Filter</Typography>
        {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{actions}</Box>}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: 5, rowGap: 2 }}>
        <MultiSelect label="Filter by Machine" options={MACHINES} selected={machines} onChange={setMachines} />
        <MultiSelect label="Filter by Recipe" options={RECIPES} selected={recipes} onChange={setRecipes} />
      </Box>

      <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <SegmentedControl
            size="sm" aria-label="Period" value={period}
            onChange={(v) => setPeriod(v as Period)}
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Weekly', value: 'weekly' }]}
          />

          {period === 'weekly' ? (
            <Select
              className="min-w-[200px]" value={String(safeWeek)}
              onChange={(v) => setWeekIdx(Number(v))}
              options={weeks.map((w, i) => ({ value: String(i), label: `Week ${i + 1} · ${weekLabel(year, month, w)}` }))}
            />
          ) : (
            <Select
              className="min-w-[180px]" value={monthKey}
              onChange={(v) => setMonthKey(v)}
              options={MONTHS.map((m) => ({ value: m.key, label: m.label }))}
            />
          )}
        </Box>

        <Button variant="secondary" size="sm" onClick={onClear}>Clear Filters</Button>
      </Box>
    </Box>
  )
}
