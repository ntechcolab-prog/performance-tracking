'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/src/ds/components/Avatar'
import { IconButton } from '@/src/ds/components/IconButton'
import { Menu, type MenuItem } from '@/src/ds/components/Menu'
import { TopBar, topBarOnDark } from '@/src/ds/components/TopBar'
import AppsIcon from '@mui/icons-material/Apps'
import MenuIcon from '@mui/icons-material/Menu'
import { BatchBookMark } from '@/src/shared/viz/BatchBookMark'
import { useSession } from '@/src/shared/client/Session'
import { isLiveMode } from '@/src/shared/data/mockData'
import { logout as irisLogout } from '@/src/shared/api/auth'

// DS TopBar with the IRIS Cloud chrome — the bar keeps the IRIS #41414a (darker
// than the DS anthracite), same as IrisTopBar.
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

  // Link entries navigate via the router; the signed-in user + company sit in the menu header.
  const menuItems: MenuItem[] = [
    ...(!live ? [{ label: 'Production Monitoring', onSelect: () => router.push('/batch-book') }] : []),
    ...(user.isAdmin ? [{ label: 'Admin · Users', onSelect: () => router.push('/admin') }] : []),
    { label: 'Log out', danger: true, divider: true, onSelect: () => { void logout() } },
  ]

  return (
    <TopBar
      className="bg-[#41414a] sm:px-6"
      start={
        <>
          <IconButton icon={<AppsIcon />} variant="ghost" aria-label="Applications"
            onClick={() => router.push(home)} className={topBarOnDark} />
          <Link href={home} aria-label="Home" className="flex items-center gap-2.5 text-fullwhite no-underline">
            <BatchBookMark size={30} />
            <span className="text-[1.05rem] font-bold tracking-[-0.01em]">Performance&nbsp;Tracking</span>
          </Link>
        </>
      }
      end={
        <>
          <Link href={home} className="flex items-center gap-2.5 text-fullwhite no-underline">
            <span className="text-[0.95rem] font-medium">Hello,</span>
            <Avatar name={user.name} size="sm" className="ring-0" />
          </Link>
          <Menu
            align="end"
            items={menuItems}
            header={
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text">{user.name}</span>
                <span className="text-xs text-text-muted">{user.company.name}</span>
              </div>
            }
            trigger={<IconButton icon={<MenuIcon />} variant="ghost" aria-label="Menu" className={topBarOnDark} />}
          />
        </>
      }
    />
  )
}
