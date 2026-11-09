import {
  cloneElement,
  isValidElement,
  useCallback,
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

type Side = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'center' | 'end'

export interface PopoverProps {
  /** The clickable element that opens the popover. */
  trigger: ReactNode
  /** Floating panel content. */
  children: ReactNode
  /** Which edge of the trigger the panel attaches to. Default `'bottom'`. */
  side?: Side
  /** Alignment along the chosen edge. Default `'center'`. */
  align?: Align
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  /** Accessible name for the dialog panel. */
  'aria-label'?: string
  /** ID of an element that labels the dialog panel. */
  'aria-labelledby'?: string
}

const GAP = 8

interface Position {
  left: number
  top: number
  tx: number
  ty: number
  origin: string
}

function computePosition(r: DOMRect, side: Side, align: Align): Position {
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  // Translate (in %) so we never need the panel's own measured size.
  const alignH = align === 'start' ? { left: r.left, tx: 0 } : align === 'end' ? { left: r.right, tx: -100 } : { left: cx, tx: -50 }
  const alignV = align === 'start' ? { top: r.top, ty: 0 } : align === 'end' ? { top: r.bottom, ty: -100 } : { top: cy, ty: -50 }

  switch (side) {
    case 'top':
      return { left: alignH.left, top: r.top - GAP, tx: alignH.tx, ty: -100, origin: 'bottom' }
    case 'left':
      return { left: r.left - GAP, top: alignV.top, tx: -100, ty: alignV.ty, origin: 'right' }
    case 'right':
      return { left: r.right + GAP, top: alignV.top, tx: 0, ty: alignV.ty, origin: 'left' }
    case 'bottom':
    default:
      return { left: alignH.left, top: r.bottom + GAP, tx: alignH.tx, ty: 0, origin: 'top' }
  }
}

export function Popover({
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: PopoverProps) {
  const triggerRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = isControlled ? controlledOpen : internalOpen

  const [pos, setPos] = useState<Position | null>(null)

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const reposition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    setPos(computePosition(el.getBoundingClientRect(), side, align))
  }, [side, align])

  // Position before paint so the panel never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  // Keep aligned on scroll / resize while open.
  useEffect(() => {
    if (!open) return
    const onChange = () => reposition()
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    return () => {
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
    }
  }, [open, reposition])

  // Move focus into the panel on open. `pos` is measured in a layout effect, so
  // the panel is not in the DOM yet on the pass where `open` flips — wait for it
  // to mount, and focus only once per open so the scroll/resize repositioning
  // below cannot steal focus back from the panel's own content.
  const focusedOnOpen = useRef(false)
  useEffect(() => {
    if (!open) {
      focusedOnOpen.current = false
      return
    }
    if (pos && !focusedOnOpen.current) {
      focusedOnOpen.current = true
      panelRef.current?.focus()
    }
  }, [open, pos])

  // Click-outside closes (no focus return).
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, setOpen])

  function close(focusTrigger = true) {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  if (!isValidElement(trigger)) {
    throw new Error('Popover `trigger` must be a single React element.')
  }

  const child = trigger as ReactElement<Record<string, unknown>>
  const triggerEl = cloneElement(child, {
    ref: triggerRef,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
    onClick: (e: React.MouseEvent) => {
      ;(child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e)
      setOpen(!open)
    },
  })

  return (
    <>
      {triggerEl}
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <div
              className="fixed z-[70]"
              style={{ left: pos.left, top: pos.top, transform: `translate(${pos.tx}%, ${pos.ty}%)` }}
            >
              <motion.div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
                tabIndex={-1}
                onKeyDown={onPanelKeyDown}
                initial={{ opacity: 1, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: pos.origin }}
                className={cn(
                  'min-w-44 rounded-card border border-border bg-surface-raised p-3 text-sm text-text shadow-lg outline-none',
                  className,
                )}
                {...tcl('Popover', { side, align, open })}
              >
                {children}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
