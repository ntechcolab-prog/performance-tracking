import type { ReactNode } from 'react'

export interface Command {
  id: string
  label: string
  group?: string
  icon?: ReactNode
  shortcut?: string
  keywords?: string
  onRun: () => void
}

/** Returns true when every char of `query` appears in order within `text`. */
function isSubsequence(query: string, text: string): boolean {
  let qi = 0
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++
  }
  return qi === query.length
}

/**
 * Filters `commands` by `query` against each command's label + keywords.
 *
 * An empty/whitespace query returns every command in its original order.
 * A command matches when the query is a substring of, or a subsequence of,
 * its searchable text. Results are ranked: exact substring matches on the
 * label first, then substring matches anywhere, then fuzzy (subsequence)
 * matches — ties keep the original order (stable).
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...commands]

  const scored: { command: Command; score: number; index: number }[] = []

  commands.forEach((command, index) => {
    const label = command.label.toLowerCase()
    const haystack = `${label} ${command.keywords?.toLowerCase() ?? ''}`.trim()

    let score: number
    if (label.startsWith(q)) score = 0
    else if (label.includes(q)) score = 1
    else if (haystack.includes(q)) score = 2
    else if (isSubsequence(q, haystack)) score = 3
    else return // no match

    scored.push({ command, score, index })
  })

  return scored
    .sort((a, b) => (a.score !== b.score ? a.score - b.score : a.index - b.index))
    .map((s) => s.command)
}
