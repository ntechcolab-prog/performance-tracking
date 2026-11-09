// ═══════════════════════════════════════════════════════════════════════════
//  PERFORMANCE TRACKING v2 · ROUTES — one URL per screen, batch and tab
// ═══════════════════════════════════════════════════════════════════════════
//
//  MIRA (the review tool) files every comment under the page's pathname, so a
//  comment on "Fineness" must live on a URL that reopens the Results tab of
//  that batch. The tree, relative to the app root:
//
//    /                        Dashboard
//    /registry                Registry list
//    /registry/new            new batch draft (what "New Batch" opens)
//    /registry/<id>           batch editor, default tab (Resume)
//    /registry/<id>/<tab>     tab = resume | product | machine | results |
//                             remarks | details | reports
//    /analysis                Analysis
//    /settings                Settings
//
//  The root is '/batch-book-v2' in the real app and '' in the MIRA static
//  build (scripts/mira-build.mjs), which also adds Next's basePath. This module
//  is plain data + parsing — no React — so the route's generateStaticParams
//  (a server export) and the client shell share it.
// ═══════════════════════════════════════════════════════════════════════════

import { REGISTRY_ROWS } from '../shared/data/appData'

export const SCREENS = ['dashboard', 'registry', 'analysis', 'settings'] as const
export type Screen = (typeof SCREENS)[number]

// The batch editor's tabs, in display order. Their URL segment is the lowercase
// label. No Period tab: start/end are edited in Resume → Batch Status (NOTI-6052).
export const EDITOR_TABS = ['Resume', 'Product', 'Machine', 'Results', 'Remarks', 'Details', 'Reports'] as const
export type EditorTab = (typeof EDITOR_TABS)[number]

/** Batch-id segment that opens a fresh draft instead of an existing batch. */
export const NEW_BATCH = 'new'

export interface AppRoute {
  /** Sidebar key. Unknown first segments come through verbatim ("coming soon"). */
  screen: string
  /** Registry only: the batch open in the editor (`NEW_BATCH` = unsaved draft). */
  batchId?: string
  /** Registry + batchId only: the tab named in the URL. Missing/unknown → Resume. */
  tab?: EditorTab
}

export function tabSlug(tab: EditorTab): string {
  return tab.toLowerCase()
}

export function tabFromSlug(slug: string | undefined): EditorTab | undefined {
  if (!slug) return undefined
  const s = slug.toLowerCase()
  return EDITOR_TABS.find((t) => tabSlug(t) === s)
}

/** Path (relative to the app root, leading slash, no trailing slash) → route. */
export function parseRoute(path: string): AppRoute {
  const [first, second, third] = path.split('/').filter(Boolean).map(decodeSegment)
  if (!first) return { screen: 'dashboard' }
  if (first === 'registry' && second) return { screen: 'registry', batchId: second, tab: tabFromSlug(third) }
  return { screen: first }
}

/**
 * Route → path relative to the app root. Resume is the batch's own URL
 * (`/registry/<id>`), so each view has exactly one canonical address; the
 * `/resume` spelling is still accepted on the way in.
 */
export function routePath(route: AppRoute): string {
  if (route.screen === 'dashboard') return '/'
  if (route.screen === 'registry' && route.batchId) {
    const batch = `/registry/${encodeURIComponent(route.batchId)}`
    return route.tab && route.tab !== 'Resume' ? `${batch}/${tabSlug(route.tab)}` : batch
  }
  return `/${route.screen}`
}

/**
 * Every path the static export must contain, as `[[...path]]` params:
 * screens, the new-batch draft, and each demo batch with each of its tabs.
 * Batches created in a session are not here — they work by client-side
 * navigation only (a hard reload on one of them 404s in a static host).
 */
export function batchBookStaticParams(): { path: string[] }[] {
  const paths: string[][] = [[], ['registry'], ['registry', NEW_BATCH], ['analysis'], ['settings']]
  for (const { id } of REGISTRY_ROWS) {
    paths.push(['registry', id])
    for (const tab of EDITOR_TABS) paths.push(['registry', id, tabSlug(tab)])
  }
  return paths.map((path) => ({ path }))
}

function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
