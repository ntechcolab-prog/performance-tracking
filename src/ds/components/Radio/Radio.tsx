import { forwardRef, useId } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, id, className, disabled, ...rest }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-2 text-sm text-text',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
        {...tcl('Radio', { label, disabled, checked: rest.checked })}
      >
        <span className="relative inline-flex size-5 shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          {/* Ring */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 rounded-round border border-border-strong bg-surface-raised transition-colors',
              'peer-checked:border-accent',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2',
            )}
          />
          {/* Dot */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto size-2.5 rounded-round bg-accent opacity-0 transition-opacity peer-checked:opacity-100"
          />
        </span>
        {label && <span>{label}</span>}
      </label>
    )
  },
)
Radio.displayName = 'Radio'

export interface RadioGroupOption {
  label: string
  value: string
}

export interface RadioGroupProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  options: RadioGroupOption[]
  label?: string
  className?: string
  disabled?: boolean
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  label,
  className,
  disabled,
}: RadioGroupProps) {
  return (
    <fieldset
      className={cn('flex flex-col gap-2 border-0 p-0 m-0', className)}
      {...tcl('RadioGroup', { name, value, label, disabled })}
    >
      {label && <legend className="mb-1 text-sm font-medium text-text">{label}</legend>}
      {options.map((opt) => (
        <Radio
          key={opt.value}
          name={name}
          value={opt.value}
          label={opt.label}
          checked={value !== undefined ? value === opt.value : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        />
      ))}
    </fieldset>
  )
}
