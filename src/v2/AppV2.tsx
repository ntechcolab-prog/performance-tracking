'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import TopBarV2 from './TopBarV2'
import SidebarV2 from './SidebarV2'
import DashboardV2 from './screens/DashboardV2'
import RegistryV2 from './screens/registry/RegistryV2'
import AnalysisV2 from './screens/analysis/AnalysisV2'
import SettingsV2 from './screens/settings/SettingsV2'
import PlaceholderScreen from './screens/PlaceholderScreen'
import { isRestricted, isScreenGated, initialScreen } from '@/src/shared/versionGate'
import { guardedLeave } from './leaveGuard'
import { SCREENS } from './routes'
import { useAppLocation } from './useAppLocation'

interface Props {
  /**
   * Where the URL tree of routes.ts is mounted ('/batch-book-v2' in the real
   * app, '' in the MIRA build). Given, the screen, batch and tab are read from
   * and written to the URL — every view has its own address. Omitted (the live
   * /iris-app, a single URL), the shell keeps them in state as it always did.
   */
  root?: string
}

// MUI counterpart of src/v1/App.tsx. Same version model: ?v=0 = restricted
// (Registry only), otherwise the full app. v1 (Tailwind) serves /batch-book;
// this one is /batch-book-v2, reached with ?v=2 from the launcher.
// The v0 rules come from src/shared/versionGate.ts — both versions obey the
// same list.
//
// The shell (TopBar + Sidebar) stays mounted while the location changes; the
// sidebar highlights the screen the URL names and navigates through the
// unsaved-changes guard, so leaving a dirty batch card still asks first.
export default function AppV2({ root }: Props) {
  const [restricted] = useState(() => isRestricted('2'))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { route, navigate } = useAppLocation(root, () => ({ screen: initialScreen(restricted, 'dashboard', SCREENS) }))

  // URL mode, first load only: v0 always lands on Registry, and the pre-routes
  // deep link ?view=<screen> maps onto its route (the param is dropped).
  useEffect(() => {
    if (root === undefined) return
    const screen = initialScreen(restricted, route.screen, SCREENS)
    if (screen !== route.screen) navigate({ screen }, { replace: true })
    // Intentionally once: it reads the URL the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gated = isScreenGated(route.screen, restricted)

  return (
    <Box className="tcl-ds" sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBarV2 />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SidebarV2
          open={sidebarOpen}
          active={route.screen}
          onSelect={(key) => guardedLeave(() => navigate({ screen: key }))}
          onToggle={() => setSidebarOpen((v) => !v)}
          restricted={restricted}
        />
        <Box component="main" sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
          {gated ? (
            <PlaceholderScreen name="coming soon" />
          ) : route.screen === 'dashboard' ? (
            <DashboardV2 />
          ) : route.screen === 'registry' ? (
            <RegistryV2 restricted={restricted} route={route} navigate={navigate} />
          ) : route.screen === 'analysis' ? (
            <AnalysisV2 />
          ) : route.screen === 'settings' ? (
            <SettingsV2 />
          ) : (
            <PlaceholderScreen name={route.screen} />
          )}
        </Box>
      </Box>
    </Box>
  )
}
