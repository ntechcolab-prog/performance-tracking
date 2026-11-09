import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { useFocusTrap, useScrollLock } from '../../helpers/overlay'

type Size = 'sm' | 'md' | 'lg'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: Size
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const sizes: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useScrollLock(open)
  useFocusTrap(open, panelRef, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            aria-label={title ? undefined : 'Dialog'}
            tabIndex={-1}
            className={cn(
              'relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-lg bg-surface-raised shadow-xl outline-none',
              sizes[size],
              className,
            )}
            // Panel opacity stays at 1 (only scale/position animate) so its text is
            // never sampled mid-fade by contrast checks; the backdrop fades instead.
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            {...tcl('Modal', { open, size, title })}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold text-text">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className={cn(
                  'ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-text-muted',
                  'transition-colors hover:bg-surface-sunken hover:text-text',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                )}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 text-sm text-text">{children}</div>

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
