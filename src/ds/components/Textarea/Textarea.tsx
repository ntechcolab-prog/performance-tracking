import { forwardRef, useId } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visible label associated with the textarea. */
  label?: string
  /** Helper text shown below the textarea. */
  hint?: string
  /** Error message; when set, the field renders an invalid state. */
  error?: string
  /** Number of visible text rows. */
  rows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, rows = 4, id, className, disabled, ...rest }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`
    const describedBy = cn(error ? errorId : null, hint ? hintId : null) || undefined

    return (
      <div
        className="flex flex-col gap-1.5"
        {...tcl('Textarea', { label, error, rows, disabled })}
      >
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-card border bg-surface-raised px-3 py-2 text-sm text-text',
            'placeholder:text-text-subtle transition-colors resize-y',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:pointer-events-none',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...rest}
        />
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
Textarea.displayName = 'Textarea'
