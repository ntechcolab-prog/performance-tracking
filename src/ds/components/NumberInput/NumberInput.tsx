import { forwardRef, useEffect, useId, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { IconButton } from '../IconButton/IconButton'

export interface NumberInputProps {
  value?: number | null
  onChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  label?: string
  hint?: string
  error?: string
  /** Number of decimal places to round to on commit. */
  precision?: number
  disabled?: boolean
  id?: string
  className?: string
  placeholder?: string
  'aria-label'?: string
}

function format(n: number, precision?: number) {
  return precision != null ? n.toFixed(precision) : String(n)
}

/**
 * Numeric field with +/- steppers. Mirrors the `Textfield` look, clamps to
 * `min`/`max` (disabling the stepper at each bound), supports ArrowUp/Down, and
 * disables wheel scrubbing. Reports parsed numbers (or `null` when empty).
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      label,
      hint,
      error,
      precision,
      disabled,
      id,
      className,
      placeholder,
      ...rest
    },
    ref,
  ) => {
    const reactId = useId()
    const inputId = id ?? reactId
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`
    const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined

    const [text, setText] = useState(value == null ? '' : String(value))

    // Keep the displayed text in sync with controlled `value` changes.
    useEffect(() => {
      setText(value == null ? '' : String(value))
    }, [value])

    const current = value ?? (text === '' ? null : Number(text))
    const numeric = current != null && !Number.isNaN(current) ? current : null

    const atMax = max != null && numeric != null && numeric >= max
    const atMin = min != null && numeric != null && numeric <= min

    function clamp(n: number) {
      let out = n
      if (min != null) out = Math.max(min, out)
      if (max != null) out = Math.min(max, out)
      return out
    }

    function commit(n: number) {
      const clamped = clamp(n)
      const rounded = precision != null ? Number(clamped.toFixed(precision)) : clamped
      setText(format(rounded, precision))
      onChange?.(rounded)
    }

    function step_(dir: 1 | -1) {
      const base = numeric ?? min ?? 0
      commit(base + dir * step)
    }

    function onInput(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value
      setText(raw)
      if (raw === '' || raw === '-') {
        onChange?.(null)
        return
      }
      const parsed = Number(raw)
      if (!Number.isNaN(parsed)) onChange?.(parsed)
    }

    function onBlur() {
      if (text === '' || text === '-') {
        onChange?.(null)
        return
      }
      const parsed = Number(text)
      if (!Number.isNaN(parsed)) commit(parsed)
    }

    function onKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        step_(1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        step_(-1)
      }
    }

    return (
      <div
        className={cn('flex flex-col gap-1.5', className)}
        {...tcl('NumberInput', { label, min, max, step, precision, disabled, error })}
      >
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            role="spinbutton"
            aria-valuenow={numeric ?? undefined}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-label={label ? undefined : rest['aria-label']}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            placeholder={placeholder}
            value={text}
            onChange={onInput}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onWheel={(e) => e.currentTarget.blur()}
            className={cn(
              'h-10 w-full rounded-card border bg-surface-raised pl-3 pr-[4.75rem] text-sm text-text',
              'placeholder:text-text-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:pointer-events-none',
              error ? 'border-danger' : 'border-border',
            )}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            <IconButton
              type="button"
              tabIndex={-1}
              size="sm"
              variant="ghost"
              aria-label="Decrease"
              disabled={disabled || atMin}
              onClick={() => step_(-1)}
              icon={<Minus className="size-4" />}
              className="size-8"
            />
            <IconButton
              type="button"
              tabIndex={-1}
              size="sm"
              variant="ghost"
              aria-label="Increase"
              disabled={disabled || atMax}
              onClick={() => step_(1)}
              icon={<Plus className="size-4" />}
              className="size-8"
            />
          </div>
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
  },
)
NumberInput.displayName = 'NumberInput'
