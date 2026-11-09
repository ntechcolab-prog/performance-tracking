/**
 * Dev Mode attributes for the Techco.lab review hub.
 *
 * The hub's Dev Mode (a Figma-style inspector) reads `data-tcl` as the
 * component name, `data-tcl-ds` as the design system it comes from (MIRA links
 * it to the component's page in its Design Systems section and to Storybook)
 * and `data-tcl-props` as a compact JSON object of primitive props, so a developer clicking an element in a published prototype sees which
 * DS component it is and how it was configured. Both are plain `data-*`
 * attributes with no styling or behaviour, so they are inert everywhere else.
 *
 * Spread the result on the component's root element — before `{...rest}` when
 * the component forwards DOM props, so a consumer can still override it:
 *
 *   <button {...tcl('Button', { variant, size, loading, disabled })} {...rest}>
 *
 * Only `string | number | boolean` values survive. `undefined`, `null`,
 * functions, React nodes, objects and arrays are dropped, as are `children`,
 * `className`, `style`, `ref` and any key starting with `on`, `aria-` or
 * `data-`. Strings are cut at 80 characters with an ellipsis and the JSON stays
 * under ~600 characters; props past that budget are dropped. When nothing
 * survives, `data-tcl-props` is omitted.
 *
 * If you copy a component out of the Storybook, take this helper with it.
 */

/** Id of this design system in MIRA's Design Systems registry. Another DS that copies this helper sets its own id. */
export const TCL_DS = 'techcolab'

export interface TclAttributes {
  'data-tcl': string
  'data-tcl-ds': string
  'data-tcl-props'?: string
}

type Primitive = string | number | boolean

const MAX_STRING = 80
const MAX_TOTAL = 600
const SKIP_KEYS = new Set(['children', 'className', 'style', 'ref', 'key'])

function isPrimitive(value: unknown): value is Primitive {
  const t = typeof value
  if (t === 'string' || t === 'boolean') return true
  return t === 'number' && Number.isFinite(value as number)
}

function isSkipped(key: string): boolean {
  return (
    SKIP_KEYS.has(key) ||
    key.startsWith('on') ||
    key.startsWith('aria-') ||
    key.startsWith('data-')
  )
}

export function tcl(name: string, props: Record<string, unknown> = {}): TclAttributes {
  const kept: Record<string, Primitive> = {}
  let json = ''

  for (const [key, raw] of Object.entries(props)) {
    if (isSkipped(key) || !isPrimitive(raw)) continue
    const value =
      typeof raw === 'string' && raw.length > MAX_STRING
        ? `${raw.slice(0, MAX_STRING - 1)}…`
        : raw
    const next = JSON.stringify({ ...kept, [key]: value })
    if (next.length > MAX_TOTAL) break
    kept[key] = value
    json = next
  }

  return json
    ? { 'data-tcl': name, 'data-tcl-ds': TCL_DS, 'data-tcl-props': json }
    : { 'data-tcl': name, 'data-tcl-ds': TCL_DS }
}
