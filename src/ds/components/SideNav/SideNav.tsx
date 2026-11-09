import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { IconButton } from '../IconButton/IconButton'
import { Tooltip } from '../Tooltip/Tooltip'

export interface SideNavItem {
  /** Stable React key. Defaults to the label. */
  key?: string
  label: string
  icon: ReactNode
  /** Renders an `<a>`; otherwise the item is a `<button>`. */
  href?: string
  onClick?: () => void
  /** Current page: highlighted and `aria-current="page"`. */
  active?: boolean
  /** Greyed out and not activatable, but still focusable so its tooltip can explain why. */
  disabled?: boolean
  /** Trailing slot when expanded — a count, "Soon", "New". */
  badge?: ReactNode
  /** Tooltip text. Default: the label, shown only when collapsed. */
  tooltip?: string
}

export interface SideNavProps {
  items: SideNavItem[]
  /** Icon-only rail; labels move into tooltips. Default `false`. */
  collapsed?: boolean
  /** When given, a collapse / expand toggle is rendered at the bottom. */
  onToggleCollapsed?: () => void
  /** Slot above the items (brand, workspace switcher). */
  header?: ReactNode
  /** Slot at the bottom, above the collapse toggle (user, help, version). */
  footer?: ReactNode
  /** `light` sits on the page surface; `dark` is the anthracite app rail. Default `'light'`. */
  tone?: 'light' | 'dark'
  /** Fires after an item is activated — e.g. to close a mobile drawer. */
  onNavigate?: (item: SideNavItem) => void
  /** Name of the `<nav>` landmark. Default `"Main"`. */
  'aria-label'?: string
  className?: string
}

const toneClass = {
  light: {
    root: 'text-text',
    item: 'text-text-muted hover:bg-surface-sunken hover:text-text',
    active: 'bg-accent-subtle text-accent',
    rail: 'bg-accent',
    disabled: 'text-text-subtle cursor-not-allowed',
    divider: 'border-border',
    toggle: '',
  },
  dark: {
    root: 'bg-anthracite-100 text-fullwhite',
    item: 'text-fullwhite/75 hover:bg-fullwhite/10 hover:text-fullwhite',
    active: 'bg-accent text-on-accent',
    rail: 'bg-fullwhite',
    disabled: 'text-fullwhite/40 cursor-not-allowed',
    divider: 'border-fullwhite/10',
    toggle: 'text-fullwhite/75 hover:bg-fullwhite/10 hover:text-fullwhite focus-visible:ring-offset-0',
  },
} as const

function NavEntry({
  item,
  collapsed,
  tone,
  onNavigate,
}: {
  item: SideNavItem
  collapsed: boolean
  tone: 'light' | 'dark'
  onNavigate?: (item: SideNavItem) => void
}) {
  const t = toneClass[tone]
  const className = cn(
    'group/nav relative flex w-full items-center gap-3 rounded-card px-3 py-2 text-left text-sm font-medium',
    'transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-focus',
    tone === 'light' ? 'focus-visible:ring-offset-2' : 'focus-visible:ring-offset-0',
    item.disabled ? t.disabled : item.active ? t.active : t.item,
    collapsed && 'justify-center px-0',
  )

  const content = (
    <>
      {item.active && !item.disabled && (
        <span aria-hidden className={cn('absolute inset-y-1 left-0 w-1 rounded-round', t.rail)} />
      )}
      <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center">
        {item.icon}
      </span>
      <span className={cn('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
      {item.badge != null && !collapsed && <span className="ml-auto shrink-0">{item.badge}</span>}
    </>
  )

  const activate = () => {
    if (item.disabled) return
    item.onClick?.()
    onNavigate?.(item)
  }

  const el =
    item.href && !item.disabled ? (
      <a href={item.href} aria-current={item.active ? 'page' : undefined} onClick={activate} className={className}>
        {content}
      </a>
    ) : (
      <button
        type="button"
        aria-current={item.active ? 'page' : undefined}
        aria-disabled={item.disabled || undefined}
        onClick={activate}
        className={className}
      >
        {content}
      </button>
    )

  const tip = item.tooltip ?? (collapsed ? item.label : undefined)
  return tip ? (
    <Tooltip content={tip} side="right">
      {el}
    </Tooltip>
  ) : (
    el
  )
}

/**
 * Vertical app navigation: items with icon + label, an active state with a
 * rail, optional badges, disabled entries, and a collapsed icon-only mode where
 * labels move into tooltips. Fills its parent's height — put it inside the
 * `<aside>` that sets the width.
 */
export function SideNav({
  items,
  collapsed = false,
  onToggleCollapsed,
  header,
  footer,
  tone = 'light',
  onNavigate,
  'aria-label': ariaLabel = 'Main',
  className,
}: SideNavProps) {
  const t = toneClass[tone]
  return (
    <div
      className={cn('flex h-full min-h-0 flex-col', t.root, className)}
      {...tcl('SideNav', { collapsed, tone })}
    >
      {header && <div className="shrink-0">{header}</div>}
      <nav aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.key ?? item.label}>
              <NavEntry item={item} collapsed={collapsed} tone={tone} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
      {(footer || onToggleCollapsed) && (
        <div className={cn('flex shrink-0 flex-col gap-1 border-t p-2', t.divider)}>
          {footer}
          {onToggleCollapsed && (
            <IconButton
              variant="ghost"
              size="sm"
              className={cn(collapsed ? 'self-center' : 'self-start', t.toggle)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              onClick={onToggleCollapsed}
              icon={
                collapsed ? (
                  <PanelLeftOpen className="size-5" strokeWidth={1.75} />
                ) : (
                  <PanelLeftClose className="size-5" strokeWidth={1.75} />
                )
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
