import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect?: () => void
  danger?: boolean
  /** Draws a separator above this item. The item itself stays a normal entry. */
  divider?: boolean
  /** Greyed out, skipped by the keyboard and not selectable. */
  disabled?: boolean
  /** Secondary line under the label. */
  description?: ReactNode
  /** Overrides the menu's `closeOnSelect` for this item. */
  closeOnSelect?: boolean
}

export interface MenuProps {
  /** Single focusable element that opens the menu. */
  trigger: ReactElement
  items: MenuItem[]
  /** Horizontal alignment relative to the trigger. Default `'start'`. */
  align?: 'start' | 'end'
  /** When false the menu stays open after an item is picked (toggles, multi-pick). Default `true`. */
  closeOnSelect?: boolean
  /** Non-interactive block above the items — e.g. the signed-in user and company. */
  header?: ReactNode
  className?: string
}

const GAP = 6

export function Menu({
  trigger,
  items,
  align = 'start',
  closeOnSelect = true,
  header,
  className,
}: MenuProps) {
  const triggerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ left: 0, top: 0 })
  const menuId = useId()

  // Every item is focusable: `divider` only draws a rule above the entry, it
  // does not replace it, so skipping those indices would strand the item
  // (usually the destructive one) out of reach of the keyboard.
  // Disabled items are skipped.
  const selectable = items.flatMap((item, i) => (item.disabled ? [] : [i]))
  const firstSelectable = selectable[0]

  function computeCoords() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ left: align === 'end' ? r.right : r.left, top: r.bottom + GAP })
  }

  function openMenu() {
    computeCoords()
    setOpen(true)
  }

  function closeMenu(focusTrigger = true) {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  // Focus the first item once the menu has mounted.
  // Only on open: re-running on every render would steal focus back to the top
  // while a `closeOnSelect={false}` menu stays open.
  useLayoutEffect(() => {
    if (open && firstSelectable != null) itemRefs.current[firstSelectable]?.focus()
    else if (open) menuRef.current?.focus()
  }, [open])

  // Click-outside closes (no focus return).
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function focusAt(pos: number) {
    if (selectable.length === 0) return
    const clamped = (pos + selectable.length) % selectable.length
    itemRefs.current[selectable[clamped]]?.focus()
  }

  function currentPos() {
    const activeIdx = itemRefs.current.findIndex((el) => el === document.activeElement)
    return selectable.indexOf(activeIdx)
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusAt(currentPos() + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusAt(currentPos() - 1)
        break
      case 'Home':
        e.preventDefault()
        focusAt(0)
        break
      case 'End':
        e.preventDefault()
        focusAt(selectable.length - 1)
        break
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
      case 'Tab':
        closeMenu(false)
        break
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openMenu()
    }
  }

  const child = Children.only(trigger)
  if (!isValidElement(child)) return child

  const triggerEl = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    onClick: () => (open ? closeMenu(false) : openMenu()),
    onKeyDown: onTriggerKeyDown,
  })

  function select(item: MenuItem) {
    if (item.disabled) return
    item.onSelect?.()
    if (item.closeOnSelect ?? closeOnSelect) closeMenu()
  }

  return (
    <>
      {triggerEl}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              id={menuId}
              role="menu"
              tabIndex={-1}
              aria-orientation="vertical"
              onKeyDown={onMenuKeyDown}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{
                left: coords.left,
                top: coords.top,
                transformOrigin: align === 'end' ? 'top right' : 'top left',
              }}
              className={cn(
                'fixed z-[70] min-w-44 rounded-card border border-border bg-surface-raised py-1 shadow-lg',
                align === 'end' && '-translate-x-full',
                className,
              )}
              {...tcl('Menu', { align, closeOnSelect })}
            >
              {header && (
                <div role="presentation" className="border-b border-border px-3 pb-2 pt-1.5 text-sm text-text">
                  {header}
                </div>
              )}
              {items.map((item, i) => (
                <div key={`${item.label}-${i}`}>
                  {item.divider && <div role="separator" className="my-1 h-px bg-border" />}
                  <button
                    type="button"
                    role="menuitem"
                    ref={(el) => {
                      itemRefs.current[i] = el
                    }}
                    disabled={item.disabled}
                    aria-disabled={item.disabled || undefined}
                    onClick={() => select(item)}
                    className={cn(
                      'flex w-full gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                      item.description ? 'items-start' : 'items-center',
                      'outline-none',
                      item.disabled
                        ? 'cursor-not-allowed text-text-muted'
                        : cn(
                            'hover:bg-surface-sunken focus:bg-surface-sunken',
                            item.danger ? 'text-danger' : 'text-text',
                          ),
                    )}
                  >
                    {item.icon && (
                      <span
                        aria-hidden
                        className={cn('inline-flex size-4 shrink-0 items-center justify-center', item.description && 'mt-0.5')}
                      >
                        {item.icon}
                      </span>
                    )}
                    {item.description ? (
                      <span className="flex min-w-0 flex-col">
                        <span>{item.label}</span>
                        <span className="text-xs text-text-muted">{item.description}</span>
                      </span>
                    ) : (
                      item.label
                    )}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
