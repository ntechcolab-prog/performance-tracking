import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs subcomponents must be used within <Tabs>')
  return ctx
}

const tabId = (baseId: string, value: string) => `${baseId}-tab-${value}`
const panelId = (baseId: string, value: string) => `${baseId}-panel-${value}`

export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, defaultValue, onValueChange, children, className }: TabsProps) {
  const baseId = useId()
  const [internal, setInternal] = useState(defaultValue ?? '')
  const isControlled = value !== undefined
  const current = isControlled ? value : internal

  function setValue(next: string) {
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
  }

  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <div className={cn('flex flex-col', className)} {...tcl('Tabs', { value: current })}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabListProps {
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export function TabList({ children, className, ...rest }: TabListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  function onKeyDown(e: React.KeyboardEvent) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? [],
    )
    if (tabs.length === 0) return
    const currentIndex = tabs.findIndex((t) => t === document.activeElement)
    let nextIndex = currentIndex
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabs.length - 1
        break
    }
    e.preventDefault()
    tabs[nextIndex]?.focus()
    tabs[nextIndex]?.click()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn('relative flex gap-1 border-b border-border', className)}
      {...tcl('TabList')}
    >
      {children}
    </div>
  )
}

export interface TabProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function Tab({ value, children, disabled, className }: TabProps) {
  const { value: current, setValue, baseId } = useTabs()
  const selected = current === value

  return (
    <button
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={selected}
      aria-controls={panelId(baseId, value)}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        'relative -mb-px px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm',
        'disabled:opacity-50 disabled:pointer-events-none',
        selected ? 'text-text' : 'text-text-muted hover:text-text',
        className,
      )}
      {...tcl('Tab', { value, disabled })}
    >
      {children}
      {selected && (
        <motion.span
          layoutId={`${baseId}-underline`}
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-round bg-accent"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </button>
  )
}

export interface TabPanelProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: current, baseId } = useTabs()
  const selected = current === value
  if (!selected) return null

  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      tabIndex={0}
      className={cn(
        'pt-4 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm',
        className,
      )}
      {...tcl('TabPanel', { value })}
    >
      {children}
    </div>
  )
}
