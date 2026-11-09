import { forwardRef, useId } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface TextfieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visible label associated with the input. */
  label?: string
  /** Helper text shown below the input. */
  hint?: string
  /** Error message; when set, the field renders an invalid state. */
  error?: string
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

export const Textfield = forwardRef<HTMLInputElement, TextfieldProps>(
  ({ label, hint, error, leadingIcon, trailingIcon, id, className, disabled, ...rest }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`
    const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined

    return (
      <div
        className="flex flex-col gap-1.5"
        {...tcl('Textfield', { label, error, disabled, type: rest.type })}
      >
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          {leadingIcon && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-text-subtle"
            >
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'h-10 w-full rounded-card border bg-surface-raised px-3 text-sm text-text',
              'placeholder:text-text-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:pointer-events-none',
              leadingIcon && 'pl-9',
              trailingIcon && 'pr-9',
              error ? 'border-danger' : 'border-border',
              className,
            )}
            {...rest}
          />
          {trailingIcon && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-text-subtle"
            >
              {trailingIcon}
            </span>
          )}
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
Textfield.displayName = 'Textfield'
