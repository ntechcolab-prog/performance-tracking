import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className} {...tcl('Breadcrumb')}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="inline-flex items-center">
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className={cn(
                      'rounded-sm text-text-muted transition-colors hover:text-text',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                    )}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn(isLast ? 'font-medium text-text' : 'text-text-muted')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden className="inline-flex items-center text-text-subtle">
                  <ChevronRight className="size-4" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
