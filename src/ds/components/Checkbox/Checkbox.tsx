import { forwardRef, useEffect, useId, useRef } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  /** Renders the mixed (dash) state and sets the DOM indeterminate flag. */
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, id, className, disabled, ...rest }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const innerRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = !!indeterminate
    }, [indeterminate])

    function setRefs(node: HTMLInputElement | null) {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-2 text-sm text-text',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
        {...tcl('Checkbox', { label, indeterminate, disabled, checked: rest.checked })}
      >
        <span className="relative inline-flex size-5 shrink-0">
          <input
            ref={setRefs}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          {/* Box */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 rounded-sm border border-border-strong bg-surface-raised transition-colors',
              'peer-checked:border-accent peer-checked:bg-accent',
              'peer-indeterminate:border-accent peer-indeterminate:bg-accent',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2',
            )}
          />
          {/* Checked icon */}
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-accent opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
          />
          {/* Indeterminate icon */}
          <Minus
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-accent opacity-0 peer-indeterminate:opacity-100"
          />
        </span>
        {label && <span>{label}</span>}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'
