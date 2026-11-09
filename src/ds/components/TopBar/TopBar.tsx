import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface TopBarProps extends HTMLAttributes<HTMLElement> {
  /** Left slot: app switcher, logo, product name. */
  start?: ReactNode
  /** Right slot: actions, greeting, avatar, menu. */
  end?: ReactNode
  /** Middle content (search, page title). Takes the free space. */
  children?: ReactNode
  /** `dark` is the anthracite app bar; `light` sits on the page surface. Default `'dark'`. */
  tone?: 'dark' | 'light'
  /** Sticks to the top of the scroll container. Default `false`. */
  sticky?: boolean
}

/**
 * Classes for ghost icon buttons placed on a dark `TopBar`, so they stay
 * legible and keep a visible hover: `<IconButton variant="ghost" className={topBarOnDark} … />`.
 */
export const topBarOnDark = 'text-fullwhite hover:bg-fullwhite/10 hover:text-fullwhite focus-visible:ring-offset-0'

/** Application bar: a `<header>` (banner landmark) with start / middle / end slots. */
export const TopBar = forwardRef<HTMLElement, TopBarProps>(
  ({ start, end, children, tone = 'dark', sticky = false, className, ...rest }, ref) => (
    <header
      ref={ref}
      className={cn(
        'flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6',
        tone === 'dark' ? 'bg-anthracite-100 text-fullwhite' : 'border-b border-border bg-surface-raised text-text',
        sticky && 'sticky top-0 z-30',
        className,
      )}
      {...tcl('TopBar', { tone, sticky })}
      {...rest}
    >
      {start && <div className="flex min-w-0 items-center gap-3">{start}</div>}
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {end && <div className="flex shrink-0 items-center gap-2 sm:gap-3">{end}</div>}
    </header>
  ),
)
TopBar.displayName = 'TopBar'
