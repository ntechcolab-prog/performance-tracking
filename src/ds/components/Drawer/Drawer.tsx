import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { useFocusTrap, useScrollLock } from '../../helpers/overlay'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: 'right' | 'left'
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  children,
  footer,
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useScrollLock(open)
  useFocusTrap(open, panelRef, onClose)

  const offscreen = side === 'right' ? '100%' : '-100%'

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/40"
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Drawer'}
            tabIndex={-1}
            className={cn(
              'absolute inset-y-0 flex w-full max-w-md flex-col bg-surface-raised shadow-xl outline-none',
              side === 'right' ? 'right-0' : 'left-0',
              className,
            )}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            {...tcl('Drawer', { open, side, title })}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold text-text">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className={cn(
                  'ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-text-muted',
                  'transition-colors hover:bg-surface-sunken hover:text-text',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                )}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-text">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
