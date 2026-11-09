import { useState } from 'react'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface Step {
  id: string
  label: string
  description?: string
  optional?: boolean
}

export interface StepperProps {
  steps: Step[]
  /** Zero-based index of the active step. */
  activeStep: number
  onStepChange?: (index: number) => void
  orientation?: 'horizontal' | 'vertical'
  /** Allow clicking completed / visited steps to navigate. Default `false`. */
  allowStepClick?: boolean
  className?: string
}

/**
 * Small hook to drive a Stepper's active index plus Back/Next handlers.
 * Tracks the furthest-reached step so `allowStepClick` can permit visited steps.
 */
export function useStepper(count: number, initial = 0) {
  const [activeStep, setActiveStep] = useState(initial)
  const [maxVisited, setMaxVisited] = useState(initial)

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(i, count - 1))
    setActiveStep(clamped)
    setMaxVisited((m) => Math.max(m, clamped))
  }
  const next = () => goTo(activeStep + 1)
  const back = () => goTo(activeStep - 1)

  return {
    activeStep,
    maxVisited,
    goTo,
    next,
    back,
    isFirst: activeStep === 0,
    isLast: activeStep === count - 1,
  }
}

export function Stepper({
  steps,
  activeStep,
  onStepChange,
  orientation = 'horizontal',
  allowStepClick = false,
  className,
}: StepperProps) {
  const isVertical = orientation === 'vertical'

  return (
    <ol
      className={cn(
        'flex',
        isVertical ? 'flex-col gap-0' : 'items-start gap-0',
        className,
      )}
      {...tcl('Stepper', { activeStep, orientation, allowStepClick })}
    >
      {steps.map((step, i) => {
        const isDone = i < activeStep
        const isActive = i === activeStep
        const isClickable = allowStepClick && i <= activeStep && !!onStepChange
        const isLast = i === steps.length - 1

        const circle = (
          <span
            aria-hidden
            className={cn(
              'relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-round border-2 text-sm font-semibold transition-colors',
              isDone && 'border-accent bg-accent text-on-accent',
              isActive && 'border-accent bg-accent-subtle text-accent',
              !isDone && !isActive && 'border-border-strong bg-surface-raised text-text-muted',
            )}
          >
            {isDone ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            ) : (
              i + 1
            )}
          </span>
        )

        const labelBlock = (
          <span className={cn('flex flex-col', isVertical ? 'items-start text-left' : 'items-start')}>
            <span
              className={cn(
                'text-sm font-medium',
                isActive ? 'text-text' : isDone ? 'text-text' : 'text-text-muted',
              )}
            >
              {step.label}
              {step.optional && (
                <span className="ml-1.5 text-xs font-normal text-text-muted">(optional)</span>
              )}
            </span>
            {step.description && (
              <span className="text-xs text-text-muted">{step.description}</span>
            )}
          </span>
        )

        const content = isClickable ? (
          <button
            type="button"
            onClick={() => onStepChange?.(i)}
            aria-label={`Go to step ${i + 1}: ${step.label}`}
            className={cn(
              'flex items-center gap-3 rounded-card text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            )}
          >
            {circle}
            {labelBlock}
          </button>
        ) : (
          <span className="flex items-center gap-3">
            {circle}
            {labelBlock}
          </span>
        )

        // Connector line between steps.
        const connector = !isLast && (
          <span
            aria-hidden
            className={cn(
              isVertical ? 'ml-4 min-h-6 w-0.5 self-stretch' : 'mx-2 h-0.5 flex-1',
              isDone ? 'bg-accent' : 'bg-border',
            )}
          />
        )

        return (
          <li
            key={step.id}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'flex',
              isVertical ? 'flex-col' : 'flex-1 flex-col last:flex-none',
            )}
          >
            <div className={cn('flex', isVertical ? 'items-center' : 'items-center')}>
              {content}
              {!isVertical && connector}
            </div>
            {isVertical && connector}
          </li>
        )
      })}
    </ol>
  )
}
