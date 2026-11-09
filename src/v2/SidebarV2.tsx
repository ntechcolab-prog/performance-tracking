'use client'

import { SideNav, type SideNavItem } from '@/src/ds/components/SideNav'
import { Badge } from '@/src/ds/components/Badge'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import RegistryIcon from '@mui/icons-material/DescriptionOutlined'
import AnalysisIcon from '@mui/icons-material/InsightsOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { isScreenGated } from '@/src/shared/versionGate'

interface NavItem {
  key: string
  label: string
  Icon: typeof DashboardIcon
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { key: 'registry', label: 'Registry', Icon: RegistryIcon },
  { key: 'analysis', label: 'Analysis', Icon: AnalysisIcon },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
]

interface SidebarProps {
  open: boolean
  active: string
  onSelect: (key: string) => void
  onToggle: () => void
  // v0: only the screens in V0_ALLOWED_SCREENS stay enabled (see shared/versionGate).
  restricted?: boolean
}

// DS SideNav rail — expanded (264px) or collapsed to icons (72px), on the IRIS
// sidebar grey (#5c5f62). v0 (restricted) leaves only Registry enabled.
export default function SidebarV2({ open, active, onSelect, onToggle, restricted = false }: SidebarProps) {
  const items: SideNavItem[] = NAV.map(({ key, label, Icon }) => {
    const disabled = isScreenGated(key, restricted)
    return {
      key,
      label,
      icon: <Icon fontSize="small" />,
      active: key === active,
      disabled,
      onClick: () => onSelect(key),
      // Disabled entries always explain themselves; otherwise the label shows only when collapsed.
      tooltip: disabled ? `${label} (coming soon)` : undefined,
      badge: disabled ? (
        <Badge size="sm" className="h-[18px] bg-fullwhite/10 px-1.5 text-[0.625rem] text-fullwhite/40">Soon</Badge>
      ) : undefined,
    }
  })

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ width: open ? '16.5rem' : '4.5rem' }}
    >
      <SideNav
        tone="dark"
        className="bg-[#5c5f62] [&_nav]:p-3 [&_nav]:pt-4"
        items={items}
        collapsed={!open}
        onToggleCollapsed={onToggle}
      />
    </aside>
  )
}
