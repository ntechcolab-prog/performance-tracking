import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface TreeNode {
  id: string
  label: string
  icon?: ReactNode
  children?: TreeNode[]
}

export interface TreeViewProps {
  nodes: TreeNode[]
  defaultExpandedIds?: string[]
  selectedId?: string
  onSelect?: (id: string) => void
  /** Controlled expansion. Provide together with `onExpandedChange`. */
  expandedIds?: string[]
  onExpandedChange?: (ids: string[]) => void
  className?: string
  /** Accessible name for the tree. */
  'aria-label'?: string
}

interface FlatNode {
  id: string
  parentId: string | null
  hasChildren: boolean
}

/** Depth-first flatten of the nodes that are currently visible (expanded). */
function flattenVisible(
  nodes: TreeNode[],
  expanded: Set<string>,
  parentId: string | null = null,
  out: FlatNode[] = [],
): FlatNode[] {
  for (const node of nodes) {
    const hasChildren = !!node.children?.length
    out.push({ id: node.id, parentId, hasChildren })
    if (hasChildren && expanded.has(node.id)) {
      flattenVisible(node.children!, expanded, node.id, out)
    }
  }
  return out
}

/** Keys the tree handles itself; see `onItemKeyDown` for why they stop bubbling. */
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Enter', ' ', 'Home', 'End'])

export function TreeView({
  nodes,
  defaultExpandedIds,
  selectedId,
  onSelect,
  expandedIds,
  onExpandedChange,
  className,
  'aria-label': ariaLabel = 'Tree',
}: TreeViewProps) {
  const isControlled = expandedIds !== undefined
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => new Set(defaultExpandedIds ?? []),
  )
  const expanded = useMemo(
    () => (isControlled ? new Set(expandedIds) : internalExpanded),
    [isControlled, expandedIds, internalExpanded],
  )

  const visible = useMemo(() => flattenVisible(nodes, expanded), [nodes, expanded])

  // Roving tabindex: which node id is currently tabbable.
  const [tabbableId, setTabbableId] = useState<string | null>(
    () => selectedId ?? nodes[0]?.id ?? null,
  )
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  function commitExpanded(next: Set<string>) {
    if (!isControlled) setInternalExpanded(next)
    onExpandedChange?.([...next])
  }
  function setExpanded(id: string, value: boolean) {
    const next = new Set(expanded)
    if (value) next.add(id)
    else next.delete(id)
    commitExpanded(next)
  }

  function focusId(id: string) {
    setTabbableId(id)
    itemRefs.current.get(id)?.focus()
  }

  function activate(id: string, hasChildren: boolean) {
    setTabbableId(id)
    onSelect?.(id)
    if (hasChildren) setExpanded(id, !expanded.has(id))
  }

  function onItemKeyDown(e: React.KeyboardEvent, id: string, hasChildren: boolean) {
    const idx = visible.findIndex((v) => v.id === id)
    if (idx === -1) return
    const flat = visible[idx]
    const isExpanded = expanded.has(id)

    // Child items render nested inside their parent's <li>, so a key we handle
    // would otherwise bubble through every ancestor treeitem and each one would
    // move focus again — the outermost winning. The item it was pressed on owns
    // it. (`onClick` stops propagation for the same reason.)
    if (NAV_KEYS.has(e.key)) e.stopPropagation()

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = visible[idx + 1]
        if (next) focusId(next.id)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = visible[idx - 1]
        if (prev) focusId(prev.id)
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        if (hasChildren && !isExpanded) setExpanded(id, true)
        else if (hasChildren && isExpanded) {
          const child = visible[idx + 1]
          if (child && child.parentId === id) focusId(child.id)
        }
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        if (hasChildren && isExpanded) setExpanded(id, false)
        else if (flat.parentId) focusId(flat.parentId)
        break
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        activate(id, hasChildren)
        break
      }
      case 'Home': {
        e.preventDefault()
        if (visible[0]) focusId(visible[0].id)
        break
      }
      case 'End': {
        e.preventDefault()
        const last = visible[visible.length - 1]
        if (last) focusId(last.id)
        break
      }
    }
  }

  function renderNodes(siblings: TreeNode[], depth: number) {
    return siblings.map((node) => {
      const hasChildren = !!node.children?.length
      const isExpanded = expanded.has(node.id)
      const isSelected = selectedId === node.id

      return (
        <li
          key={node.id}
          ref={(el) => {
            if (el) itemRefs.current.set(node.id, el)
            else itemRefs.current.delete(node.id)
          }}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
          aria-level={depth + 1}
          tabIndex={tabbableId === node.id ? 0 : -1}
          onKeyDown={(e) => onItemKeyDown(e, node.id, hasChildren)}
          onClick={(e) => {
            e.stopPropagation()
            activate(node.id, hasChildren)
          }}
          className="group/ti block outline-none"
        >
          {/* Visual row (the treeitem itself owns focus). */}
          <div
            style={{ paddingLeft: depth * 18 + 8 }}
            className={cn(
              'flex h-9 cursor-pointer items-center gap-1.5 rounded-card pr-2 text-sm transition-colors',
              'group-focus-visible/ti:ring-2 group-focus-visible/ti:ring-focus group-focus-visible/ti:ring-inset',
              isSelected ? 'bg-accent-subtle text-accent' : 'text-text group-hover/ti:bg-surface-sunken',
            )}
          >
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              {hasChildren && (
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex"
                >
                  <ChevronRight
                    className={cn('size-4', isSelected ? 'text-accent' : 'text-text-subtle')}
                    aria-hidden
                  />
                </motion.span>
              )}
            </span>
            {node.icon && (
              <span
                aria-hidden
                className={cn(
                  'inline-flex size-4 shrink-0 items-center justify-center',
                  isSelected ? 'text-accent' : 'text-text-muted',
                )}
              >
                {node.icon}
              </span>
            )}
            <span className="truncate">{node.label}</span>
          </div>

          {hasChildren && (
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.ul
                  role="group"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {renderNodes(node.children!, depth + 1)}
                </motion.ul>
              )}
            </AnimatePresence>
          )}
        </li>
      )
    })
  }

  return (
    <ul
      role="tree"
      aria-label={ariaLabel}
      className={cn('select-none', className)}
      {...tcl('TreeView', { selectedId, label: ariaLabel })}
    >
      {renderNodes(nodes, 0)}
    </ul>
  )
}
