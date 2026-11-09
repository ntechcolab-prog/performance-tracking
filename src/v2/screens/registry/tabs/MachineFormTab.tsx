'use client'

import Box from '@mui/material/Box'
import { Select as DsSelect } from '@/src/ds/components/Select'
import { Textfield } from '@/src/ds/components/Textfield'
import type { MachineData } from '@/src/shared/data/batchForm'
import {
  MACHINE_TYPES, EQUIPMENTS, GRINDING_TECH, LINERS, SEPARATIONS,
  SEALING_LIQUIDS, SIEVE_SIZES, BEAD_MATERIALS, BEAD_TYPES,
} from '@/src/shared/data/batchForm'
import { Stat } from '../ui'
import { EditableCard, useEditing } from '../cardEdit'

// Read mode shows the values as plain text (label + value, like the Resume
// cards). The fields only appear while the Mill card is being edited.

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <DsSelect label={label} value={value} options={options.map((o) => ({ label: o, value: o }))} onChange={onChange} />
  )
}

function Text({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <Textfield
      label={label} value={value} onChange={(e) => onChange(e.target.value)}
      trailingIcon={suffix ? <span className="text-sm">{suffix}</span> : undefined}
    />
  )
}

const dash = (v: string, unit?: string) => (v ? (unit ? `${v} ${unit}` : v) : '—')
const filling = (kg: string, pct: string) => (kg || pct ? `${dash(kg, 'kg')} · ${dash(pct, '%')}` : '—')

const GRID = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 } as const

export default function MachineFormTab({ value, onChange }: { value: MachineData; onChange: (v: MachineData) => void }) {
  const set = <K extends keyof MachineData>(key: K, v: MachineData[K]) => onChange({ ...value, [key]: v })
  const on = useEditing('machine')

  return (
    <EditableCard cardId="machine" title="Mill">
      {on ? (
        <Box sx={GRID}>
          <Text label="Name" value={value.name} onChange={(v) => set('name', v)} />
          <Select label="Machine Type" value={value.machineType} options={MACHINE_TYPES} onChange={(v) => set('machineType', v)} />
          <Select label="Equipment" value={value.equipment} options={EQUIPMENTS} onChange={(v) => set('equipment', v)} />

          <Select label="Grinding Technology" value={value.grindingTech} options={GRINDING_TECH} onChange={(v) => set('grindingTech', v)} />
          <Select label="Inner liner material" value={value.innerLiner} options={LINERS} onChange={(v) => set('innerLiner', v)} />
          <Select label="Separation System" value={value.separationSystem} options={SEPARATIONS} onChange={(v) => set('separationSystem', v)} />

          <Select label="Sealing Liquid" value={value.sealingLiquid} options={SEALING_LIQUIDS} onChange={(v) => set('sealingLiquid', v)} />
          <Select label="Sieve Size (mm)" value={value.sieveSize} options={SIEVE_SIZES} onChange={(v) => set('sieveSize', v)} />
          <Select label="Bead Material" value={value.beadMaterial} options={BEAD_MATERIALS} onChange={(v) => set('beadMaterial', v)} />

          <Select label="Bead 1 Type" value={value.bead1Type} options={BEAD_TYPES} onChange={(v) => set('bead1Type', v)} />
          <Select label="Bead 1 Size" value={value.bead1Size} options={['0.2', '0.4', '0.6', '0.8']} onChange={(v) => set('bead1Size', v)} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Text label="Filling" value={value.bead1FillKg} onChange={(v) => set('bead1FillKg', v)} suffix="kg" />
            <Text label="Filling" value={value.bead1FillPct} onChange={(v) => set('bead1FillPct', v)} suffix="%" />
          </Box>

          <Select label="Bead 2 Type" value={value.bead2Type} options={BEAD_TYPES} onChange={(v) => set('bead2Type', v)} />
          <Select label="Bead 2 Size" value={value.bead2Size} options={['0.2', '0.4', '0.6', '0.8']} onChange={(v) => set('bead2Size', v)} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Text label="Filling" value={value.bead2FillKg} onChange={(v) => set('bead2FillKg', v)} suffix="kg" />
            <Text label="Filling" value={value.bead2FillPct} onChange={(v) => set('bead2FillPct', v)} suffix="%" />
          </Box>
        </Box>
      ) : (
        <Box sx={GRID}>
          <Stat label="Name" value={dash(value.name)} />
          <Stat label="Machine Type" value={dash(value.machineType)} />
          <Stat label="Equipment" value={dash(value.equipment)} />

          <Stat label="Grinding Technology" value={dash(value.grindingTech)} />
          <Stat label="Inner liner material" value={dash(value.innerLiner)} />
          <Stat label="Separation System" value={dash(value.separationSystem)} />

          <Stat label="Sealing Liquid" value={dash(value.sealingLiquid)} />
          <Stat label="Sieve Size (mm)" value={dash(value.sieveSize)} />
          <Stat label="Bead Material" value={dash(value.beadMaterial)} />

          <Stat label="Bead 1 Type" value={dash(value.bead1Type)} />
          <Stat label="Bead 1 Size" value={dash(value.bead1Size)} />
          <Stat label="Bead 1 Filling" value={filling(value.bead1FillKg, value.bead1FillPct)} />

          <Stat label="Bead 2 Type" value={dash(value.bead2Type)} />
          <Stat label="Bead 2 Size" value={dash(value.bead2Size)} />
          <Stat label="Bead 2 Filling" value={filling(value.bead2FillKg, value.bead2FillPct)} />
        </Box>
      )}
    </EditableCard>
  )
}
