import { useEffect, useRef, useState } from 'react'

/**
 * Measures the rendered width of a container so charts can draw an SVG at exact
 * pixel coordinates (which keeps an HTML tooltip overlay perfectly aligned with
 * SVG points). Falls back to `initial` until the first measurement and tracks
 * resizes via `ResizeObserver`.
 */
export function useChartWidth(initial = 600): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(initial)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setWidth(w)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}
