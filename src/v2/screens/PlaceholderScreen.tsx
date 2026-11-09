'use client'

import Box from '@mui/material/Box'
import { Card } from '@/src/ds/components/Card'
import Typography from '@mui/material/Typography'
import { Badge } from '@/src/ds/components/Badge'

// Temporary stand-in while each screen is migrated to MUI in Fase 2. Renders the
// screen name so the shell (topbar + sidebar + routing) can be validated first.
export default function PlaceholderScreen({ name }: { name: string }) {
  return (
    <Box sx={{ p: 4 }}>
      <Card className="flex items-center gap-4 p-8">
        <Typography variant="h5" sx={{ textTransform: 'capitalize' }}>{name}</Typography>
        <Badge variant="info" size="sm">MUI — in progress</Badge>
      </Card>
    </Box>
  )
}
