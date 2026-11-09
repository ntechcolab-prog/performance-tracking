'use client'

// ═══════════════════════════════════════════════════════════════════════════
//  PERFORMANCE TRACKING v2 · LIVE — ENTRY POINT (real IRIS / Notify data)
// ═══════════════════════════════════════════════════════════════════════════
//  Mounted by app/iris-app/page.tsx, client-only, behind IRIS auth.
//
//  Same designed v2 screens as src/v2/AppV2.tsx, but fed by the real API
//  (src/shared/api/) instead of the synthetic dataset (src/shared/data/).
//  AppV2 is the demo/design build; this is the one wired to production data.
// ═══════════════════════════════════════════════════════════════════════════

// Renders the EXACT v2 app (TopBar + Sidebar + all screens) with REAL backend
// data injected before mount. Secondary path — /batch-book-v2 (mock) untouched.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import { Spinner } from '@/src/ds/components/Spinner'
import Typography from '@mui/material/Typography'
import { isAuthenticated } from '@/src/shared/api/tokenStore'
import { activeOrganizationId, currentClaims } from '@/src/shared/api/auth'
import { SessionProvider, type SessionUser } from '@/src/shared/client/Session'
import AppV2 from '@/src/v2/AppV2'
import { loadLiveApp } from './loadLiveApp'

export default function LiveApp() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = useMemo<SessionUser>(() => {
    const c = currentClaims()
    const name = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim()
    return {
      id: c?.id ?? '',
      name: name || c?.['e-mail'] || 'User',
      email: c?.['e-mail'] ?? '',
      isAdmin: false,
      company: { id: activeOrganizationId() ?? '', name: 'Notify / IRIS' },
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    loadLiveApp()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [router])

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Failed to load live data: {error}</Typography>
      </Box>
    )
  }
  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="lg" />
      </Box>
    )
  }
  return (
    <SessionProvider user={user}>
      <AppV2 />
    </SessionProvider>
  )
}
