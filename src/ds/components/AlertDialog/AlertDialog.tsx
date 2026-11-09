import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { useFocusTrap, useScrollLock } from '../../helpers/overlay'
import { Button } from '../Button/Button'

export interface AlertDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `'danger'` styles the confirm button as destructive. Default `'default'`. */
  variant?: 'default' | 'danger'
  className?: string
}

/**
 * A focused confirmation dialog. Built on the same overlay primitives as
 * `Modal` but with `role="alertdialog"`, the cancel button focused by default
 * (the safe choice), and an opinionated confirm/cancel footer.
 */
export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  className,
}: AlertDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()

  useScrollLock(open)
  // Cancel is rendered first in the footer, so the focus trap lands on it by default.
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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              'relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-lg bg-surface-raised p-5 shadow-xl outline-none',
              className,
            )}
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            {...tcl('AlertDialog', { open, variant, title })}
          >
            <div className="flex flex-col gap-1.5">
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-sm text-text-muted">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
