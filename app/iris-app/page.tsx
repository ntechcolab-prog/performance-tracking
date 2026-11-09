'use client'

// The full designed Performance Tracking v2 app (TopBar + Sidebar + screens) with REAL
// data. Client-only (localStorage auth, ECharts, window layout), wrapped in the
// same providers /batch-book-v2 uses. IRIS-gated (exempt from the legacy gate).

import dynamic from 'next/dynamic'
import { MuiProvider } from '@/src/shared/client/mui/MuiProvider'
import { CompanyStateProvider } from '@/src/shared/client/CompanyState'

const LiveApp = dynamic(() => import('@/src/v2/live/LiveApp'), { ssr: false })

export default function IrisAppPage() {
  return (
    <MuiProvider>
      <CompanyStateProvider initial={{}}>
        <LiveApp />
      </CompanyStateProvider>
    </MuiProvider>
  )
}
