'use client'

// ═══════════════════════════════════════════════════════════════════════════
//  PERFORMANCE TRACKING v1 (and v0) — Tailwind app · ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════
//  Mounted by app/(app)/batch-book/page.tsx, client-only.
//
//  This single app serves TWO versions:
//    v1  full app (default)
//    v0  restricted edition — same code with ?v=0. See src/shared/versionGate.ts
//        for exactly what v0 hides; nothing else should decide that.
//
//  The MUI rebuild of this app is src/v2/AppV2.tsx (route /batch-book-v2).
//  Everything under src/v1/ belongs to this app only. Domain logic, the
//  dataset, the API client and the cross-version primitives live in
//  src/shared/ — v2 reads those too, so treat them as a contract.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import AppHeader from './components/AppHeader'
import Sidebar from './components/Sidebar'
import ComingSoon from './components/ComingSoon'
import DashboardScreen from './screens/DashboardScreen'
import DashboardV2Screen from './screens/DashboardV2Screen'
import RegistryScreen from './screens/RegistryScreen'
import AnalysisScreen from './screens/AnalysisScreen'
import SettingsScreen from './screens/SettingsScreen'
import { useLocalStorage } from '../shared/lib/useLocalStorage'
import { isRestricted, isScreenGated, initialScreen } from '../shared/versionGate'

const SCREENS = ['dashboard', 'dashboard-v2', 'registry', 'analysis', 'settings']

export default function App() {
  // v0 vs v1 is decided by the URL (?v=0). What exactly v0 hides lives in
  // src/shared/versionGate.ts — don't spread the rule around here.
  const [restricted] = useState(() => isRestricted('1'))

  const [sidebarOpen, setSidebarOpen] = useState(true)
  // v0 always lands on Registry; v1 accepts ?view= to open straight onto a screen.
  const [activeNav, setActiveNav] = useState(() => initialScreen(restricted, 'dashboard', SCREENS))

  // Branding (name + icon) — persisted; editable UI was removed with NameIdeas.
  const [appName] = useLocalStorage<string>('dr-name-current', 'Performance Tracking')
  const [appIcon] = useLocalStorage<string | null>('dr-app-icon', null)

  const gated = isScreenGated(activeNav, restricted)

  return (
    <div className="flex h-screen flex-col">
      <AppHeader name={appName} icon={appIcon} restricted={restricted} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          active={activeNav}
          onSelect={setActiveNav}
          onToggle={() => setSidebarOpen((v) => !v)}
          restricted={restricted}
        />

        <main className="flex-1 overflow-auto">
          {gated ? (
            <div className="p-6">
              <ComingSoon />
            </div>
          ) : (
            <>
              {activeNav === 'dashboard' && <DashboardScreen onNavigate={setActiveNav} />}
              {activeNav === 'dashboard-v2' && <DashboardV2Screen />}
              {activeNav === 'registry' && <RegistryScreen restricted={restricted} />}
              {activeNav === 'analysis' && <AnalysisScreen />}
              {activeNav === 'settings' && <SettingsScreen />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
