import { useId, useRef } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

interface BaseSliderProps {
  min?: number
  max?: number
  step?: number
  label?: string
  className?: string
  /** Accessible name when no visible `label` is provided. */
  'aria-label'?: string
}

export type SliderProps = BaseSliderProps &
  (
    | { range?: false; value: number; onChange: (value: number) => void }
    | { range: true; value: [number, number]; onChange: (value: [number, number]) => void }
  )

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Range input with one thumb (or two when `range`). Each thumb is a focusable
 * `role="slider"` handle supporting Arrow / Home / End / PageUp / PageDown, and
 * pointer dragging. The filled portion of the track reflects the value(s).
 */
export function Slider(props: SliderProps) {
  const { min = 0, max = 100, step = 1, label, className } = props
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragging = useRef<number | null>(null)
  const baseId = useId()

  const values: number[] = props.range ? props.value : [props.value]
  const name = label ?? props['aria-label'] ?? 'Value'

  function emit(next: number[]) {
    if (props.range) {
      props.onChange([next[0], next[1]] as [number, number])
    } else {
      props.onChange(next[0])
    }
  }

  function snap(raw: number) {
    const stepped = Math.round((raw - min) / step) * step + min
    return clamp(Number(stepped.toFixed(10)), min, max)
  }

  function setThumb(index: number, raw: number) {
    const v = snap(raw)
    const next = [...values]
    // Keep thumbs from crossing in range mode.
    const lo = index === 1 ? values[0] : min
    const hi = index === 0 && props.range ? values[1] : max
    next[index] = clamp(v, lo, hi)
    emit(next)
  }

  function valueFromPointer(clientX: number) {
    const track = trackRef.current
    if (!track) return min
    const rect = track.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return min + ratio * (max - min)
  }

  function nearestThumb(value: number) {
    if (!props.range) return 0
    return Math.abs(value - values[0]) <= Math.abs(value - values[1]) ? 0 : 1
  }

  function onPointerDown(e: React.PointerEvent) {
    const raw = valueFromPointer(e.clientX)
    const index = nearestThumb(raw)
    dragging.current = index
    trackRef.current?.setPointerCapture(e.pointerId)
    thumbRefs.current[index]?.focus()
    setThumb(index, raw)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragging.current === null) return
    setThumb(dragging.current, valueFromPointer(e.clientX))
  }

  function onPointerUp(e: React.PointerEvent) {
    dragging.current = null
    trackRef.current?.releasePointerCapture(e.pointerId)
  }

  function onThumbKeyDown(e: React.KeyboardEvent, index: number) {
    const page = Math.max(step, (max - min) / 10)
    let next: number | null = null
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = values[index] - step
        break
      case 'ArrowRight':
      case 'ArrowUp':
        next = values[index] + step
        break
      case 'PageDown':
        next = values[index] - page
        break
      case 'PageUp':
        next = values[index] + page
        break
      case 'Home':
        next = min
        break
      case 'End':
        next = max
        break
    }
    if (next !== null) {
      e.preventDefault()
      setThumb(index, next)
    }
  }

  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const fillLeft = props.range ? pct(values[0]) : 0
  const fillRight = props.range ? pct(values[1]) : pct(values[0])

  return (
    <div
      className={cn('flex w-full flex-col gap-2', className)}
      {...tcl('Slider', { range: props.range === true, min, max, step, label })}
    >
      {label && (
        <span id={`${baseId}-label`} className="text-sm font-medium text-text">
          {label}
        </span>
      )}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative flex h-5 w-full touch-none items-center"
      >
        <span className="absolute inset-x-0 h-1.5 rounded-round bg-surface-sunken" aria-hidden />
        <span
          aria-hidden
          className="absolute h-1.5 rounded-round bg-accent"
          style={{ left: `${fillLeft}%`, right: `${100 - fillRight}%` }}
        />
        {values.map((v, i) => (
          <div
            key={i}
            ref={(el) => {
              thumbRefs.current[i] = el
            }}
            role="slider"
            tabIndex={0}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={v}
            aria-valuetext={String(v)}
            aria-label={props.range ? `${name} ${i === 0 ? 'minimum' : 'maximum'}` : name}
            aria-labelledby={!props.range && label ? `${baseId}-label` : undefined}
            onKeyDown={(e) => onThumbKeyDown(e, i)}
            className={cn(
              'absolute size-4 -translate-x-1/2 cursor-grab rounded-round border-2 border-accent bg-surface-raised shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            )}
            style={{ left: `${pct(v)}%` }}
          />
        ))}
      </div>
    </div>
  )
}
