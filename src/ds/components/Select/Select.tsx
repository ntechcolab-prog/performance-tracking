import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  label,
  error,
  disabled,
  className,
}: SelectProps) {
  const baseId = useId()
  const triggerId = `${baseId}-trigger`
  const labelId = `${baseId}-label`
  const listId = `${baseId}-list`
  const errorId = `${baseId}-error`

  const [open, setOpen] = useState(false)
  const selectedIndex = options.findIndex((o) => o.value === value)
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  function openList() {
    if (disabled) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }
  function closeList(focusTrigger = true) {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }
  function selectIndex(i: number) {
    const opt = options[i]
    if (!opt) return
    onChange?.(opt.value)
    closeList()
  }

  // Focus the listbox when it opens.
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  // Click-outside closes (no focus return to trigger).
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openList()
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        selectIndex(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        closeList()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div
      className="flex flex-col gap-1.5"
      {...tcl('Select', { label, value, placeholder, disabled, error })}
    >
      {label && (
        <span id={labelId} className="text-sm font-medium text-text">
          {label}
        </span>
      )}
      <div ref={rootRef} className={cn('relative', className)}>
        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => (open ? closeList(false) : openList())}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            'inline-flex h-10 w-full items-center justify-between gap-2 rounded-card border bg-surface-raised px-3 text-sm text-text',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:pointer-events-none',
            error ? 'border-danger' : 'border-border',
          )}
        >
          <span className={cn(!selected && 'text-text-muted')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-text-subtle transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={label ? labelId : undefined}
              aria-activedescendant={`${baseId}-opt-${activeIndex}`}
              onKeyDown={onListKeyDown}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-card border border-border bg-surface-raised py-1 shadow-lg',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
              )}
            >
              {options.map((opt, i) => {
                const isSelected = opt.value === value
                const isActive = i === activeIndex
                return (
                  <li
                    key={opt.value}
                    id={`${baseId}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectIndex(i)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-text',
                      isActive && 'bg-surface-sunken',
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="size-4 text-accent" aria-hidden />}
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
