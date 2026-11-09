import { forwardRef, useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  /** Image URL. Falls back to initials when absent or failing to load. */
  src?: string
  /** Full name — used for the image alt text and to derive initials. */
  name: string
  size?: AvatarSize
  className?: string
}

const sizes: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
}

/** Derives up to two uppercase initials from a name. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, name, size = 'md', className }, ref) => {
    const [failed, setFailed] = useState(false)

    // Reset the error state if the source changes.
    useEffect(() => setFailed(false), [src])

    const showImage = src && !failed

    return (
      <span
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-round',
          'bg-accent-subtle font-semibold text-accent ring-2 ring-surface-raised',
          sizes[size],
          className,
        )}
        {...tcl('Avatar', { name, size })}
      >
        {showImage ? (
          <img
            src={src}
            alt={name}
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span aria-hidden>{getInitials(name)}</span>
        )}
        {/* Provide an accessible name when only initials are shown. */}
        {!showImage && <span className="sr-only">{name}</span>}
      </span>
    )
  },
)
Avatar.displayName = 'Avatar'

export interface AvatarGroupProps {
  /** Maximum avatars to show before collapsing into a `+N` chip. */
  max?: number
  children: ReactNode
  className?: string
}

export function AvatarGroup({ max, children, className }: AvatarGroupProps) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  const visible = max != null ? items.slice(0, max) : items
  const overflow = items.length - visible.length

  return (
    <div className={cn('flex items-center -space-x-2', className)} {...tcl('AvatarGroup', { max })}>
      {visible}
      {overflow > 0 && (
        <span
          className={cn(
            'relative inline-flex size-10 shrink-0 items-center justify-center rounded-round',
            'bg-surface-sunken text-sm font-semibold text-text-muted ring-2 ring-surface-raised',
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
