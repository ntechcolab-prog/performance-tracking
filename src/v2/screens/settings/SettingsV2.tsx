'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import { Card } from '@/src/ds/components/Card'
import { Tabs, TabList, Tab } from '@/src/ds/components/Tabs'
import Typography from '@mui/material/Typography'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { SETTINGS_TABS } from '@/src/shared/data/appData'
import { GeneralSettingsV2, DataExportSettingsV2 } from './MiscSettingsV2'
import AvailabilitySettingsV2 from './AvailabilitySettingsV2'
import ProductionSettingsV2 from './ProductionSettingsV2'

// v2 Settings screen (Techco.lab DS widgets). Mirrors the Tailwind SettingsScreen (tabbed:
// General / Availability / Data Export) and reuses every bit of business logic —
// the availability hooks/services and the same localStorage keys — so v0/v1 and
// v2 read and write the same settings.
// v2 shows Availability (hours per day + planning calendar) next to the shared tabs;
// v1 keeps its own list in appData.
const SETTINGS_TABS_V2 = ['General', 'Availability', ...SETTINGS_TABS.filter((t) => t !== 'General')]

export default function SettingsV2() {
  const [tab, setTab] = useState('General')

  return (
    <Box sx={{ maxWidth: '80rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
      {/* Sub-header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsOutlinedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Settings</Typography>
      </Box>

      {/* Tabs */}
      <Card className="px-2 pb-1 pt-1">
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Settings sections" className="overflow-x-auto overflow-y-hidden border-b-0 pb-1">
            {SETTINGS_TABS_V2.map((t) => (
              <Tab key={t} value={t} className="whitespace-nowrap py-3">
                {t}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      </Card>

      {tab === 'General' ? (
        <GeneralSettingsV2 />
      ) : tab === 'Availability' ? (
        <AvailabilitySettingsV2 />
      ) : tab === 'Production' ? (
        <ProductionSettingsV2 />
      ) : tab === 'Data Export' ? (
        <DataExportSettingsV2 />
      ) : (
        <Card className="grid place-items-center p-20 text-center">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>{tab}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              This settings section isn&apos;t built out yet.
            </Typography>
          </Box>
        </Card>
      )}
    </Box>
  )
}
