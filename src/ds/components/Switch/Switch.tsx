import { useId } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface SwitchProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
  /** Accessible name when no visible `label` is provided. */
  'aria-label'?: string
}

export function Switch({ checked = false, onChange, label, disabled, className, ...rest }: SwitchProps) {
  const labelId = useId()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={label ? labelId : undefined}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'group inline-flex items-center gap-2',
        'focus-visible:outline-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
      {...tcl('Switch', { checked, label, disabled })}
    >
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-round p-0.5 transition-colors',
          'group-focus-visible:ring-2 group-focus-visible:ring-focus group-focus-visible:ring-offset-2',
          checked ? 'bg-accent' : 'bg-border-strong',
        )}
      >
        <motion.span
          layout
          className="size-5 rounded-round bg-fullwhite shadow-sm"
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
      {label && (
        <span id={labelId} className="text-sm text-text">
          {label}
        </span>
      )}
    </button>
  )
}
