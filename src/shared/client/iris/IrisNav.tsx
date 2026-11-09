'use client'

// Shared top navigation for the IRIS (real-data) app surface. Makes every screen
// reachable from every screen, with the active one highlighted.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/src/shared/api/auth'

const LINKS: { href: string; label: string }[] = [
  { href: '/iris-app', label: 'Full app' },
  { href: '/iris-dashboard', label: 'Dashboard' },
  { href: '/iris-machines', label: 'Machines' },
  { href: '/iris-registry', label: 'Registry' },
  { href: '/iris-production', label: 'Production' },
  { href: '/iris-sensors', label: 'Sensors' },
  { href: '/iris-trends', label: 'Trends' },
  { href: '/iris-alarms', label: 'Alarms' },
  { href: '/iris-status', label: 'Diagnostic' },
]

export default function IrisNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 border-b border-line/60 pb-3">
      <span className="mr-2 text-sm font-bold text-ink">Performance Tracking</span>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + '/')
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-primary text-white' : 'text-muted hover:bg-page hover:text-ink'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
      <button
        onClick={() => logout().then(() => router.replace('/'))}
        className="ml-auto rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-page hover:text-ink"
      >
        Log out
      </button>
    </nav>
  )
}
