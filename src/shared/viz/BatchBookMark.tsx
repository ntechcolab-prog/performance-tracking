// ─── SHARED (v1 + v2) ────────────────────────────────────────────────────────
// The Performance Tracking brand mark. Worn by both chromes: v1 AppHeader and v2 TopBarV2.
// ⚠ Changing this affects BOTH versions of the app.
// ─────────────────────────────────────────────────────────────────────────────
// Performance Tracking brand mark — "Entry": the bound spine plus the lines of a record.
// Built on the IRIS Cloud logo grid (64 box, tile radius 14.6% of the side,
// drawing centred in ~60% of the tile) so it sits next to IRIS Cloud and
// Production Monitoring as part of the same family.

const TILE = '#46aa9f' // primary/500 — same teal as the app

/** The drawing only, white by default. Use over an already-coloured surface. */
export function BatchBookGlyph({ fg = '#fff' }: { fg?: string }) {
  return (
    <>
      <rect x="17" y="15" width="5.5" height="34" rx="2.75" fill={fg} />
      <g fill="none" stroke={fg} strokeWidth="5.5" strokeLinecap="round">
        <path d="M31 23h16" />
        <path d="M31 32h16" />
        <path d="M31 41h9" />
      </g>
    </>
  )
}

/** Full mark: rounded tile + glyph. */
export function BatchBookMark({
  size = 32,
  tile = TILE,
  fg = '#fff',
  className,
}: {
  size?: number
  tile?: string
  fg?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Performance Tracking"
    >
      <rect width="64" height="64" rx="9.5" fill={tile} />
      <BatchBookGlyph fg={fg} />
    </svg>
  )
}

/**
 * Same mark redrawn on the 24 grid the product launcher uses (stroked icons,
 * strokeWidth 1.9 inherited from the parent svg). The spine keeps its extra
 * weight so the mark still reads as itself at 18px.
 */
export const BATCH_BOOK_GLYPH = (
  <>
    <path d="M5 4v16" strokeWidth="3" />
    <path d="M11.5 8h8" />
    <path d="M11.5 12h8" />
    <path d="M11.5 16h4.5" />
  </>
)
