import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type ToastVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  /** Auto-dismiss delay in ms. Default 4000. */
  duration?: number
}

interface ToastItem extends Required<Omit<ToastOptions, 'description'>> {
  id: string
  description?: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastVariant, typeof Info> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
}

const iconColors: Record<ToastVariant, string> = {
  neutral: 'text-text-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'neutral', duration = 4000 }: ToastOptions) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev, { id, title, description, variant, duration }])
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
          {...tcl('ToastProvider')}
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const Icon = icons[t.variant]
              return (
                <motion.div
                  key={t.id}
                  role={t.variant === 'danger' ? 'alert' : 'status'}
                  aria-live={t.variant === 'danger' ? 'assertive' : 'polite'}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'pointer-events-auto flex items-start gap-3 rounded-card border border-border',
                    'bg-surface-raised p-3 shadow-lg',
                  )}
                  {...tcl('Toast', { variant: t.variant, title: t.title, duration: t.duration })}
                >
                  <Icon className={cn('mt-0.5 size-5 shrink-0', iconColors[t.variant])} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{t.title}</p>
                    {t.description && (
                      <p className="mt-0.5 text-sm text-text-muted">{t.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className={cn(
                      'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-text-muted',
                      'transition-colors hover:bg-surface-sunken hover:text-text',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                    )}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>')
  return ctx
}
