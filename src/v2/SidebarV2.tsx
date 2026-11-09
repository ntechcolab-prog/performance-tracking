'use client'

import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { Tooltip } from '@/src/ds/components/Tooltip'
import { Badge } from '@/src/ds/components/Badge'
import { IconButton } from '@/src/ds/components/IconButton'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import RegistryIcon from '@mui/icons-material/DescriptionOutlined'
import AnalysisIcon from '@mui/icons-material/InsightsOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import CollapseIcon from '@mui/icons-material/MenuOpen'
import { iris } from '@/src/shared/client/mui/theme'
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

// MUI sidebar rail — expanded (264px) or collapsed to icons (72px), matching the
// Tailwind Sidebar behavior. v0 (restricted) leaves only Registry enabled.
export default function SidebarV2({ open, active, onSelect, onToggle, restricted = false }: SidebarProps) {
  return (
    <Box
      component="aside"
      sx={{
        width: open ? '16.5rem' : '4.5rem',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: iris.sidebar,
        color: '#fff',
        transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <List sx={{ flex: 1, p: 1.5, pt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {NAV.map(({ key, label, Icon }) => {
          const disabled = isScreenGated(key, restricted)
          const isActive = key === active
          const tip = !open || disabled ? (disabled ? `${label} (coming soon)` : label) : ''
          const item = (
                <ListItemButton
                  disabled={disabled}
                  selected={isActive}
                  onClick={() => !disabled && onSelect(key)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.25,
                    justifyContent: open ? 'flex-start' : 'center',
                    color: 'rgba(255,255,255,0.7)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: iris.primary, color: '#fff' },
                    '&.Mui-disabled': { opacity: 1, color: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 0, color: 'inherit', justifyContent: 'center' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={label}
                      slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }}
                    />
                  )}
                  {open && disabled && (
                    <Badge size="sm" className="h-[18px] bg-fullwhite/10 px-1.5 text-[0.625rem] text-fullwhite/40">Soon</Badge>
                  )}
                </ListItemButton>
          )
          return tip ? (
            <Tooltip key={key} content={tip} side="right">
              <span className="block">{item}</span>
            </Tooltip>
          ) : (
            <span key={key} className="block">{item}</span>
          )
        })}
      </List>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 1.5 }}>
        <IconButton
          onClick={onToggle}
          variant="ghost"
          aria-label={open ? 'Collapse menu' : 'Expand menu'}
          className="h-11 w-full text-fullwhite/70 hover:bg-fullwhite/10 hover:text-fullwhite"
          icon={<CollapseIcon sx={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s' }} />}
        />
      </Box>
    </Box>
  )
}
