import { type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface ToggleGroupOption {
  value: string
  label?: string
  icon?: ReactNode
  'aria-label'?: string
}

interface BaseProps {
  options: ToggleGroupOption[]
  size?: 'sm' | 'md'
  className?: string
  /** Accessible name for the toolbar group. */
  'aria-label'?: string
}

export type ToggleGroupProps = BaseProps &
  (
    | { type: 'single'; value: string; onChange: (value: string) => void }
    | { type: 'multiple'; value: string[]; onChange: (value: string[]) => void }
  )

const sizes = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-10 px-3 text-sm gap-2',
}

/**
 * Toolbar-style button group with shared borders. `type="single"` behaves like
 * an exclusive choice (e.g. text alignment); `type="multiple"` toggles each item
 * independently. Items are buttons with `aria-pressed`.
 */
export function ToggleGroup(props: ToggleGroupProps) {
  const { options, size = 'md', className } = props

  function isPressed(value: string) {
    return props.type === 'single' ? props.value === value : props.value.includes(value)
  }

  function toggle(value: string) {
    if (props.type === 'single') {
      props.onChange(value)
    } else {
      const set = props.value.includes(value)
        ? props.value.filter((v) => v !== value)
        : [...props.value, value]
      props.onChange(set)
    }
  }

  return (
    <div
      role="group"
      aria-label={props['aria-label']}
      className={cn('inline-flex', className)}
      {...tcl('ToggleGroup', { type: props.type, size })}
    >
      {options.map((opt, i) => {
        const pressed = isPressed(opt.value)
        const first = i === 0
        const last = i === options.length - 1
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={pressed}
            aria-label={opt.label ? undefined : opt['aria-label']}
            onClick={() => toggle(opt.value)}
            className={cn(
              'relative inline-flex items-center justify-center border border-border-strong font-medium transition-colors',
              'focus-visible:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
              sizes[size],
              !first && '-ml-px',
              first && 'rounded-l-card',
              last && 'rounded-r-card',
              pressed
                ? 'z-[1] bg-accent-subtle text-accent'
                : 'bg-surface-raised text-text hover:bg-surface-sunken',
            )}
          >
            {opt.icon && (
              <span aria-hidden className="inline-flex size-4 items-center justify-center">
                {opt.icon}
              </span>
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
