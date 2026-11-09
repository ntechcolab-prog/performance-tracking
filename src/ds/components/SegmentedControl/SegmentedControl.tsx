import { useId, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface SegmentedOption {
  label: string
  value: string
  icon?: ReactNode
}

export interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  className?: string
  /** Accessible name for the group. */
  'aria-label'?: string
}

const sizes = {
  sm: 'h-8 text-xs',
  md: 'h-10 text-sm',
}

/**
 * Single-select pill group (period switcher / iOS-style segmented control).
 * `role="radiogroup"` with roving tabindex and Arrow-key navigation; the active
 * segment is marked by an animated `layoutId` indicator.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ...rest
}: SegmentedControlProps) {
  const groupId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function move(from: number, dir: 1 | -1) {
    const next = (from + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        move(index, 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        move(index, -1)
        break
      case 'Home':
        e.preventDefault()
        onChange(options[0].value)
        refs.current[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        onChange(options[options.length - 1].value)
        refs.current[options.length - 1]?.focus()
        break
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn('inline-flex items-center gap-1 rounded-card bg-surface-sunken p-1', className)}
      {...tcl('SegmentedControl', { size, value })}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-sm px-3 font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
              sizes[size],
              selected ? 'text-text' : 'text-text-muted hover:text-text',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${groupId}-indicator`}
                className="absolute inset-0 rounded-sm bg-surface-raised shadow-sm"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            {opt.icon && (
              <span aria-hidden className="relative z-10 inline-flex size-4 items-center justify-center">
                {opt.icon}
              </span>
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
