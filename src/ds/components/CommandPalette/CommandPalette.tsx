import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { useFocusTrap, useScrollLock } from '../../helpers/overlay'
import { filterCommands, type Command } from './logic'

export type { Command } from './logic'

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
  placeholder?: string
  className?: string
}

/** Wires a global ⌘K / Ctrl+K listener and returns palette open state. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
  return { open, setOpen }
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = 'Type a command or search…',
  className,
}: CommandPaletteProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const inputId = `${baseId}-input`

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  useScrollLock(open)
  useFocusTrap(open, panelRef, onClose)

  const results = useMemo(() => filterCommands(commands, query), [commands, query])

  // Reset query / active item whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  // Keep the active index in range as results change.
  useEffect(() => {
    setActiveIndex((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)))
  }, [results.length])

  // Group the (already ranked) results, preserving first-seen group order.
  const groups = useMemo(() => {
    const map = new Map<string, { command: Command; index: number }[]>()
    results.forEach((command, index) => {
      const key = command.group ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ command, index })
    })
    return [...map.entries()]
  }, [results])

  const optionId = (i: number) => `${baseId}-opt-${i}`

  function scrollActiveIntoView(i: number) {
    const el = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(i))}`)
    el?.scrollIntoView({ block: 'nearest' })
  }

  function run(index: number) {
    const cmd = results[index]
    if (!cmd) return
    cmd.onRun()
    onClose()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = results.length === 0 ? 0 : (i + 1) % results.length
        scrollActiveIntoView(next)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = results.length === 0 ? 0 : (i - 1 + results.length) % results.length
        scrollActiveIntoView(next)
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(activeIndex)
    }
    // Escape is handled by useFocusTrap.
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
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
            aria-label="Command palette"
            className={cn(
              'relative z-10 flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-surface-raised shadow-xl outline-none',
              className,
            )}
            initial={{ scale: 0.97, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={onKeyDown}
            {...tcl('CommandPalette', { open, placeholder })}
          >
            {/* Search input */}
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="size-4 shrink-0 text-text-subtle" aria-hidden />
              <input
                id={inputId}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
                aria-label="Search commands"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="h-12 w-full bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
              />
            </div>

            {/* Results */}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Commands"
              className="flex-1 overflow-y-auto p-2"
            >
              {results.length === 0 ? (
                // `role="listbox"` must contain options, so the empty state is a
                // disabled one rather than a bare paragraph (same as Combobox).
                <div
                  role="option"
                  aria-disabled
                  aria-selected={false}
                  className="px-3 py-6 text-center text-sm text-text-muted"
                >
                  No commands found.
                </div>
              ) : (
                groups.map(([group, items]) => (
                  <div key={group || '_'} role="group" aria-label={group || 'Commands'}>
                    {group && (
                      <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {group}
                      </div>
                    )}
                    {items.map(({ command, index }) => {
                      const isActive = index === activeIndex
                      return (
                        <div
                          key={command.id}
                          id={optionId(index)}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => run(index)}
                          onMouseMove={() => setActiveIndex(index)}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-card px-3 py-2 text-sm',
                            isActive ? 'bg-accent-subtle text-accent' : 'text-text',
                          )}
                        >
                          {command.icon && (
                            <span
                              aria-hidden
                              className={cn(
                                'inline-flex size-4 shrink-0 items-center justify-center',
                                isActive ? 'text-accent' : 'text-text-muted',
                              )}
                            >
                              {command.icon}
                            </span>
                          )}
                          <span className="flex-1 truncate">{command.label}</span>
                          {command.shortcut && (
                            <kbd
                              className={cn(
                                'rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-xs',
                                isActive ? 'text-accent' : 'text-text-muted',
                              )}
                            >
                              {command.shortcut}
                            </kbd>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
