import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
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
  /** Free-text mode. Typed text is kept as the value (single: emitted through
   *  `onChange` as you type; an exact label match emits that option's value),
   *  focusing an existing value does not clear it, and text that matches no
   *  option is offered as a "Create" entry at the end of the list. */
  creatable?: boolean
  /** Label of the create entry. Default `Create "<text>"`. */
  createLabel?: (text: string) => ReactNode
  /** Fired when the create entry is picked, with the trimmed text. */
  onCreate?: (text: string) => void
  /** Accessible name when there is no visible `label`. */
  'aria-label'?: string
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

/** A rendered list entry: an option, or the synthetic "Create" entry. */
type Item = ComboboxOption & { create?: boolean }

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
    creatable = false,
    createLabel,
    onCreate,
    'aria-label': ariaLabel,
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
  // True once the user typed since opening: until then the list is not filtered,
  // so a creatable field that opens with its current text still shows every option.
  const [typed, setTyped] = useState(false)
  // Creatable fields start with nothing highlighted, so Enter keeps the typed text.
  const firstActive = creatable ? -1 : 0
  const [activeIndex, setActiveIndex] = useState(firstActive)

  const selectedValues: string[] = multiple
    ? ((props.value as string[] | undefined) ?? [])
    : props.value
      ? [props.value as string]
      : []

  const singleSelected = !multiple
    ? options.find((o) => o.value === (props.value as string | null | undefined))
    : undefined

  // Text shown in a closed single field: the option label, or the free text.
  const singleDisplay = !multiple
    ? (singleSelected?.label ?? (creatable ? ((props.value as string | null | undefined) ?? '') : ''))
    : ''

  const filtered = useMemo<Item[]>(() => {
    const q = typed ? query.trim().toLowerCase() : ''
    const shown = onSearch || !q ? options : options.filter((o) => o.label.toLowerCase().includes(q))
    const text = query.trim()
    if (
      creatable &&
      typed &&
      text &&
      !options.some((o) => o.label.toLowerCase() === text.toLowerCase())
    ) {
      return [...shown, { label: text, value: text, create: true }]
    }
    return shown
  }, [options, query, typed, onSearch, creatable])

  // Keep the active option in range as the list changes.
  useEffect(() => {
    setActiveIndex((i) => Math.min(Math.max(i, firstActive), Math.max(filtered.length - 1, firstActive)))
  }, [filtered.length, firstActive])

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
    if (!open) {
      // A creatable single field keeps its text when it opens instead of clearing it.
      setQuery(creatable && !multiple ? singleDisplay : '')
      setTyped(false)
    }
    setOpen(true)
    setActiveIndex(firstActive)
  }

  function emitSearch(q: string) {
    setQuery(q)
    setTyped(true)
    if (!open) setOpen(true)
    setActiveIndex(firstActive)
    onSearch?.(q)
    if (creatable && !multiple) {
      const match = options.find((o) => o.label.toLowerCase() === q.trim().toLowerCase())
      ;(props.onChange as ((v: string | null) => void) | undefined)?.(match ? match.value : q === '' ? null : q)
    }
  }

  function commit(option: Item) {
    if (option.disabled) return
    if (option.create) onCreate?.(option.value)
    if (multiple) {
      const current = (props.value as string[] | undefined) ?? []
      const next = current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value]
      ;(props.onChange as ((v: string[]) => void) | undefined)?.(next)
      setQuery('')
      setTyped(false)
      onSearch?.('')
      inputRef.current?.focus()
    } else {
      ;(props.onChange as ((v: string | null) => void) | undefined)?.(option.value)
      setQuery(creatable ? option.label : '')
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
        else if (open && creatable) {
          // Nothing highlighted: keep the typed text (multiple: add it as a chip).
          e.preventDefault()
          const text = query.trim()
          if (multiple && text) {
            const match = options.find((o) => o.label.toLowerCase() === text.toLowerCase())
            commit(match ?? { label: text, value: text, create: true })
          } else setOpen(false)
        }
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

  // Single-select: show the selected label (or free text) when closed; the live query when open.
  const inputValue = multiple ? query : open ? query : singleDisplay

  const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined
  const activeId = open && filtered[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined

  return (
    <div
      className="flex flex-col gap-1.5"
      {...tcl('Combobox', { multiple, label, placeholder, disabled, error, creatable })}
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
            aria-label={label ? undefined : ariaLabel}
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
              aria-label={label ?? ariaLabel ?? 'Options'}
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
                  const isSelected = !opt.create && selectedValues.includes(opt.value)
                  const isActive = i === activeIndex
                  return (
                    <li
                      key={opt.create ? `create:${opt.value}` : opt.value}
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
                      <span>
                        {opt.create
                          ? (createLabel?.(opt.value) ?? (
                              <>
                                Create <strong className="font-semibold">&ldquo;{opt.value}&rdquo;</strong>
                              </>
                            ))
                          : opt.label}
                      </span>
                      {isSelected && !opt.create && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
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
