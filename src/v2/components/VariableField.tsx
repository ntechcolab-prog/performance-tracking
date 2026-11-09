'use client'

import { Combobox, type ComboboxOption } from '@/src/ds/components/Combobox'
import type { ResultVariable } from '@/src/shared/lib/resultVariables'

interface Props {
  /** What is typed in the field. */
  value: string
  onChange: (v: string) => void
  /** The result variables catalog (Settings › Production). */
  catalog: ResultVariable[]
  /** Names already used in this table — hidden from the options. */
  exclude: string[]
}

// Variable picker shared by Product › Expected Results and Settings › Production:
// options come from the catalog, and a typed name that isn't there is offered as
// "Create". The caller adds it to the catalog when the row is committed.
export default function VariableField({ value, onChange, catalog, exclude }: Props) {
  const taken = new Set(exclude.map((x) => x.toLowerCase()))
  const options: ComboboxOption[] = catalog
    .filter((v) => !taken.has(v.name.toLowerCase()))
    .map((v) => ({ label: v.name, value: v.name }))

  return (
    <Combobox
      creatable
      aria-label="Variable"
      placeholder="Pick or type a new one"
      options={options}
      value={value || null}
      onChange={(v) => onChange(v ?? '')}
      emptyMessage="No variables"
      className="w-full"
    />
  )
}
