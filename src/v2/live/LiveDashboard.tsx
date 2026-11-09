'use client'

// The DESIGNED Performance Tracking dashboard KPI grid (MUI), fed with REAL data.
// Secondary path — the mock dashboard at /batch-book-v2 is untouched.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import IrisNav from '@/src/shared/client/iris/IrisNav'
import { isAuthenticated } from '@/src/shared/api/tokenStore'
import MetricsGridV2Mui from '@/src/v2/components/metrics/MetricsGridV2Mui'
import { loadLiveKpis } from './liveDashboardData'
import type { Kpi } from '@/src/shared/lib/compute'

export default function LiveDashboard() {
  const router = useRouter()
  const [kpis, setKpis] = useState<Kpi[] | null>(null)
  const [count, setCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    loadLiveKpis()
      .then((r) => {
        setKpis(r.kpis)
        setCount(r.count)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [router])

  return (
    <Box sx={{ maxWidth: '75rem', mx: 'auto', p: 2.5 }}>
      <Box sx={{ '& nav': { mb: 3 } }}>
        <IrisNav />
      </Box>

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Dashboard · live
        </Typography>
        {kpis && (
          <Typography variant="body2" color="text.secondary">
            {count} most recent completed batches · cooling / carbon / prod-idle have no backend source (—)
          </Typography>
        )}
      </Box>

      {error && (
        <Card sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Card>
      )}

      {!kpis && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {kpis && (
        <Card sx={{ p: 2, overflow: 'hidden' }}>
          <MetricsGridV2Mui kpis={kpis} series={{}} />
        </Card>
      )}
    </Box>
  )
}
