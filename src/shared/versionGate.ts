// ═══════════════════════════════════════════════════════════════════════════
//  PERFORMANCE TRACKING VERSIONS — single source of truth
// ═══════════════════════════════════════════════════════════════════════════
//
//  v0  RESTRICTED edition. Not a separate codebase: it is the v1 app running
//      with `?v=0`. Registry is the only screen, and inside a batch only the
//      Resume tab. Everything else renders disabled / "Coming Soon".
//      → /batch-book?v=0
//
//  v1  the full Tailwind app (the default). Code lives in `src/v1/`.
//      → /batch-book  (or ?v=1)
//
//  v2  Material UI + ECharts rebuild, parallel to v1. Code lives in `src/v2/`.
//      Honours the SAME v0 restriction when it gets `?v=0`.
//      → /batch-book-v2  (?v=2 from the launcher)
//      → the /iris-* routes run v2 against real data (`src/v2/live/`)
//
//  This module lives in `shared/` rather than inside `v1/` precisely because
//  both implementations (Tailwind and MUI) have to agree on what v0 hides.
//  Changing the v0 rules? Change them HERE and both versions follow.
// ═══════════════════════════════════════════════════════════════════════════

export type AppVersion = '0' | '1' | '2'

/** Screens v0 allows. Any other nav key renders "Coming Soon". */
export const V0_ALLOWED_SCREENS = ['registry'] as const

/** Batch-editor tabs v0 allows. The rest are disabled. */
export const V0_ALLOWED_EDITOR_STEPS = ['Resume'] as const

/**
 * Version asked for in the URL (`?v=`). There is no URL on the server, so it
 * falls back there.
 *
 * @param fallback version to use when the param is missing or invalid — the
 *                 Tailwind app passes '1', the MUI app passes '2'.
 */
export function readVersion(fallback: AppVersion): AppVersion {
  if (typeof window === 'undefined') return fallback
  const v = new URLSearchParams(window.location.search).get('v')
  return v === '0' || v === '1' || v === '2' ? v : fallback
}

/**
 * Running as v0 (restricted edition)?
 * Used by App.tsx (v1) and AppV2.tsx (v2) — both read the same URL.
 */
export function isRestricted(fallback: AppVersion = '1'): boolean {
  return readVersion(fallback) === '0'
}

/** Under v0, is this screen blocked? Outside v0 nothing is blocked. */
export function isScreenGated(screen: string, restricted: boolean): boolean {
  return restricted && !(V0_ALLOWED_SCREENS as readonly string[]).includes(screen)
}

/** Editor tabs to disable. Outside v0, none. */
export function gatedEditorSteps<T extends string>(steps: readonly T[], restricted: boolean): T[] {
  if (!restricted) return []
  return steps.filter((s) => !(V0_ALLOWED_EDITOR_STEPS as readonly string[]).includes(s))
}

/** Landing screen: v0 always opens Registry; the other versions pick. */
export function initialScreen(restricted: boolean, preferred: string, allowed: readonly string[]): string {
  if (restricted) return V0_ALLOWED_SCREENS[0]
  if (typeof window !== 'undefined') {
    const view = new URLSearchParams(window.location.search).get('view')
    if (view && allowed.includes(view)) return view
  }
  return preferred
}
