import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { Badge } from '../Badge'

export interface ComboboxOption {
  label: string
  value: string
  disabled?: boolean
}

interface ComboboxBaseProps {
  options: ComboboxOption[]
  placeholder?: string
  label?: string
  hint?: string
  error?: string
  disabled?: boolean
  /** Optional async hook. When given, client-side filtering is skipped and the
   *  parent is expected to update `options` in response. */
  onSearch?: (query: string) => void
  /** Shown when there are no options to display. Default `"No results"`. */
  emptyMessage?: string
  className?: string
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false
  value?: string | null
  onChange?: (value: string | null) => void
}

export interface ComboboxMultiProps extends ComboboxBaseProps {
  multiple: true
  value?: string[]
  onChange?: (value: string[]) => void
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultiProps

export function Combobox(props: ComboboxProps) {
  const {
    options,
    placeholder = 'Search…',
    label,
    hint,
    error,
    disabled,
    onSearch,
    emptyMessage = 'No results',
    className,
  } = props
  const multiple = props.multiple === true

  const baseId = useId()
  const inputId = `${baseId}-input`
  const labelId = `${baseId}-label`
  const listId = `${baseId}-list`
  const hintId = `${baseId}-hint`
  const errorId = `${baseId}-error`

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedValues: string[] = multiple
    ? ((props.value as string[] | undefined) ?? [])
    : props.value
      ? [props.value as string]
      : []

  const singleSelected = !multiple
    ? options.find((o) => o.value === (props.value as string | null | undefined))
    : undefined

  const filtered = useMemo(() => {
    if (onSearch) return options
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, onSearch])

  // Keep the active option in range as the list changes.
  useEffect(() => {
    setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(filtered.length - 1, 0)))
  }, [filtered.length])

  // Scroll the active option into view.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`#${baseId}-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, baseId])

  // Click-outside closes.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function openList() {
    if (disabled) return
    setOpen(true)
    setActiveIndex(0)
  }

  function emitSearch(q: string) {
    setQuery(q)
    if (!open) setOpen(true)
    setActiveIndex(0)
    onSearch?.(q)
  }

  function commit(option: ComboboxOption) {
    if (option.disabled) return
    if (multiple) {
      const current = (props.value as string[] | undefined) ?? []
      const next = current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value]
      ;(props.onChange as ((v: string[]) => void) | undefined)?.(next)
      setQuery('')
      onSearch?.('')
      inputRef.current?.focus()
    } else {
      ;(props.onChange as ((v: string | null) => void) | undefined)?.(option.value)
      setQuery('')
      setOpen(false)
      inputRef.current?.focus()
    }
  }

  function removeAt(value: string) {
    if (!multiple) return
    const current = (props.value as string[] | undefined) ?? []
    ;(props.onChange as ((v: string[]) => void) | undefined)?.(current.filter((v) => v !== value))
    inputRef.current?.focus()
  }

  function nextEnabled(from: number, dir: 1 | -1): number {
    let i = from
    for (let step = 0; step < filtered.length; step++) {
      i += dir
      if (i < 0) i = filtered.length - 1
      if (i > filtered.length - 1) i = 0
      if (!filtered[i]?.disabled) return i
    }
    return from
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openList()
        else setActiveIndex((i) => nextEnabled(i, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openList()
        else setActiveIndex((i) => nextEnabled(i, -1))
        break
      case 'Home':
        if (open) { e.preventDefault(); setActiveIndex(filtered.findIndex((o) => !o.disabled)) }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          for (let i = filtered.length - 1; i >= 0; i--) if (!filtered[i].disabled) { setActiveIndex(i); break }
        }
        break
      case 'Enter':
        if (open && filtered[activeIndex]) { e.preventDefault(); commit(filtered[activeIndex]) }
        break
      case 'Escape':
        if (open) { e.preventDefault(); setOpen(false) }
        break
      case 'Backspace':
        if (multiple && query === '' && selectedValues.length > 0) {
          removeAt(selectedValues[selectedValues.length - 1])
        }
        break
    }
  }

  // Single-select: show the selected label when closed; the live query when open.
  const inputValue = multiple ? query : open ? query : (singleSelected?.label ?? '')

  const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined
  const activeId = open && filtered[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined

  return (
    <div
      className="flex flex-col gap-1.5"
      {...tcl('Combobox', { multiple, label, placeholder, disabled, error })}
    >
      {label && (
        <label id={labelId} htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div ref={rootRef} className={cn('relative', className)}>
        <div
          onMouseDown={(e) => {
            // Keep focus on the input when clicking padding/chips area.
            if (e.target !== inputRef.current) {
              e.preventDefault()
              inputRef.current?.focus()
              if (!open) openList()
            }
          }}
          className={cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-card border bg-surface-raised px-2 py-1.5 text-sm',
            'transition-colors focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2',
            disabled && 'opacity-50 pointer-events-none',
            error ? 'border-danger' : 'border-border',
          )}
        >
          {multiple &&
            selectedValues.map((v) => {
              const opt = options.find((o) => o.value === v)
              return (
                <Badge key={v} variant="neutral" size="sm" className="gap-1 pr-1">
                  {opt?.label ?? v}
                  <button
                    type="button"
                    aria-label={`Remove ${opt?.label ?? v}`}
                    onClick={() => removeAt(v)}
                    className="inline-flex items-center justify-center rounded-round p-0.5 text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              )
            })}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-labelledby={label ? labelId : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            value={inputValue}
            placeholder={selectedValues.length === 0 || multiple ? placeholder : undefined}
            onChange={(e) => emitSearch(e.target.value)}
            onFocus={() => openList()}
            onKeyDown={onKeyDown}
            className="min-w-24 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
          />
          <ChevronDown
            className={cn('size-4 shrink-0 text-text-subtle transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </div>

        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label ?? 'Options'}
              aria-multiselectable={multiple || undefined}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-card border border-border bg-surface-raised py-1 shadow-lg"
            >
              {filtered.length === 0 ? (
                <li role="option" aria-disabled aria-selected={false} className="px-3 py-2 text-sm text-text-muted">
                  {emptyMessage}
                </li>
              ) : (
                filtered.map((opt, i) => {
                  const isSelected = selectedValues.includes(opt.value)
                  const isActive = i === activeIndex
                  return (
                    <li
                      key={opt.value}
                      id={`${baseId}-opt-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled || undefined}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(opt)}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2 text-sm text-text',
                        opt.disabled ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer',
                        isActive && !opt.disabled && 'bg-surface-sunken',
                      )}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                    </li>
                  )
                })
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
