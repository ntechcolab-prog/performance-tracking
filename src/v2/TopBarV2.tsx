'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Avatar } from '@/src/ds/components/Avatar'
import { IconButton } from '@/src/ds/components/IconButton'
import { Menu, type MenuItem } from '@/src/ds/components/Menu'
import { Tooltip } from '@/src/ds/components/Tooltip'
import AppsIcon from '@mui/icons-material/Apps'
import MenuIcon from '@mui/icons-material/Menu'
import { BatchBookMark } from '@/src/shared/viz/BatchBookMark'
import { useSession } from '@/src/shared/client/Session'
import { iris } from '@/src/shared/client/mui/theme'
import { isLiveMode } from '@/src/shared/data/mockData'
import { logout as irisLogout } from '@/src/shared/api/auth'

// MUI counterpart of IrisTopBar — same IRIS Cloud chrome, dark #41414a bar.
export default function TopBarV2() {
  const user = useSession()
  const router = useRouter()

  // In the live (IRIS) app, home is the app itself and auth is IRIS — never the
  // legacy launcher / cookie login.
  const live = isLiveMode()
  const home = live ? '/iris-app' : '/'

  async function logout() {
    if (live) {
      await irisLogout().catch(() => {})
      router.replace('/')
      return
    }
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  // DS Menu only takes plain items: link entries navigate via the router; the
  // user name / company header moved to a tooltip on the avatar.
  const menuItems: MenuItem[] = [
    ...(!live ? [{ label: 'Production Monitoring', onSelect: () => router.push('/batch-book') }] : []),
    ...(user.isAdmin ? [{ label: 'Admin · Users', onSelect: () => router.push('/admin') }] : []),
    { label: 'Log out', danger: true, divider: true, onSelect: () => { void logout() } },
  ]
  const onDark = 'text-fullwhite hover:bg-fullwhite/10 hover:text-fullwhite'

  const row = { display: 'flex', alignItems: 'center' } as const

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: iris.irisTopbar }}>
      <Toolbar sx={{ minHeight: 64, px: 3, justifyContent: 'space-between' }}>
        <Box sx={{ ...row, gap: 2.5 }}>
          <IconButton icon={<AppsIcon />} variant="ghost" aria-label="Applications"
            onClick={() => router.push(home)} className={onDark} />
          <Box component={Link} href={home} aria-label="Home" sx={{ ...row, textDecoration: 'none', color: '#fff' }}>
            <Box sx={{ ...row, gap: 1.25 }}>
              <BatchBookMark size={30} />
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                Performance&nbsp;Tracking
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ ...row, gap: 2.5 }}>
          <Box component={Link} href={home} sx={{ ...row, gap: 1.25, color: '#fff', textDecoration: 'none' }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500 }}>Hello,</Typography>
            <Tooltip content={`${user.name} · ${user.company.name}`} side="bottom">
              <span><Avatar name={user.name} size="sm" className="ring-0" /></span>
            </Tooltip>
          </Box>

          <Menu align="end" items={menuItems}
            trigger={<IconButton icon={<MenuIcon />} variant="ghost" aria-label="Menu" className={onDark} />} />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
