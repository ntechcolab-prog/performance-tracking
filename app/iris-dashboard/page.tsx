'use client'

// Secondary path: the designed Performance Tracking dashboard (MUI) with real data.
// Client-only (localStorage auth, ECharts, window layout), wrapped in MuiProvider
// like /batch-book-v2. IRIS-gated (exempt from the legacy cookie gate).

import dynamic from 'next/dynamic'
import { MuiProvider } from '@/src/shared/client/mui/MuiProvider'
import { CompanyStateProvider } from '@/src/shared/client/CompanyState'

const LiveDashboard = dynamic(() => import('@/src/v2/live/LiveDashboard'), { ssr: false })

// The designed v2 components read UI prefs via CompanyState (metric order/style).
// An empty in-memory store is enough here — writes try to persist but failures
// are swallowed, so no dependency on the legacy Neon backend.
export default function IrisDashboardPage() {
  return (
    <MuiProvider>
      <CompanyStateProvider initial={{}}>
        <LiveDashboard />
      </CompanyStateProvider>
    </MuiProvider>
  )
}
