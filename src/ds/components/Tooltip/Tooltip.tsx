import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
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

export interface TooltipProps {
  content: ReactNode
  side?: Side
  /** Single focusable element that triggers the tooltip. */
  children: ReactElement
  /** Hover-open delay in ms. Default 300. */
  delay?: number
}

const GAP = 8

interface Coords {
  left: number
  top: number
}

export function Tooltip({ content, side = 'top', children, delay = 300 }: TooltipProps) {
  const triggerRef = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<Coords>({ left: 0, top: 0 })
  const tooltipId = useId()

  function computeCoords() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const positions: Record<Side, Coords> = {
      top: { left: r.left + r.width / 2, top: r.top - GAP },
      bottom: { left: r.left + r.width / 2, top: r.bottom + GAP },
      left: { left: r.left - GAP, top: r.top + r.height / 2 },
      right: { left: r.right + GAP, top: r.top + r.height / 2 },
    }
    setCoords(positions[side])
  }

  function show(immediate = false) {
    clearTimeout(timer.current)
    if (immediate) {
      computeCoords()
      setOpen(true)
      return
    }
    timer.current = setTimeout(() => {
      computeCoords()
      setOpen(true)
    }, delay)
  }

  function hide() {
    clearTimeout(timer.current)
    setOpen(false)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  const child = Children.only(children)
  if (!isValidElement(child)) return child

  const trigger = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    'aria-describedby': open ? tooltipId : undefined,
    onMouseEnter: () => show(),
    onMouseLeave: () => hide(),
    onFocus: () => show(true),
    onBlur: () => hide(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    },
  })

  const transforms: Record<Side, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  }

  const arrow: Record<Side, string> = {
    top: 'bottom-[-3px] left-1/2 -translate-x-1/2',
    bottom: 'top-[-3px] left-1/2 -translate-x-1/2',
    left: 'right-[-3px] top-1/2 -translate-y-1/2',
    right: 'left-[-3px] top-1/2 -translate-y-1/2',
  }

  return (
    <>
      {trigger}
      {createPortal(
        <AnimatePresence>
          {open && (
            <div
              role="tooltip"
              id={tooltipId}
              className={cn('pointer-events-none fixed z-[70]', transforms[side])}
              style={{ left: coords.left, top: coords.top }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="relative rounded-sm bg-anthracite-100 px-2 py-1 text-xs font-medium text-fullwhite shadow-md"
                {...tcl('Tooltip', { side, delay })}
              >
                {content}
                <span
                  aria-hidden
                  className={cn('absolute size-2 rotate-45 bg-anthracite-100', arrow[side])}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
