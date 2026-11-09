import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  /** `single` (default) keeps one panel open at a time; `multiple` is independent. */
  type?: 'single' | 'multiple'
  defaultOpen?: string[]
  className?: string
}

export function Accordion({ items, type = 'single', defaultOpen = [], className }: AccordionProps) {
  const baseId = useId()
  const [open, setOpen] = useState<string[]>(defaultOpen)

  function toggle(id: string) {
    setOpen((prev) => {
      const isOpen = prev.includes(id)
      if (type === 'single') return isOpen ? [] : [id]
      return isOpen ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  return (
    <div
      className={cn('divide-y divide-border rounded-card border border-border', className)}
      {...tcl('Accordion', { type })}
    >
      {items.map((item) => {
        const isOpen = open.includes(item.id)
        const headerId = `${baseId}-h-${item.id}`
        const panelId = `${baseId}-p-${item.id}`
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text',
                  'transition-colors hover:bg-surface-sunken',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset',
                )}
              >
                {item.title}
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'size-4 shrink-0 text-text-muted transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0 text-sm text-text-muted">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
