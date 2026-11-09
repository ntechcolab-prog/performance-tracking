import { forwardRef } from 'react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface-raised rounded-card border border-border shadow-sm overflow-hidden',
        className,
      )}
      {...tcl('Card')}
      {...rest}
    >
      {children}
    </div>
  ),
)
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 px-5 pt-5', className)}
      {...tcl('CardHeader')}
      {...rest}
    >
      {children}
    </div>
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...rest }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-semibold text-text', className)}
      {...tcl('CardTitle')}
      {...rest}
    >
      {children}
    </h3>
  ),
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...rest }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-muted', className)}
    {...tcl('CardDescription')}
    {...rest}
  >
    {children}
  </p>
))
CardDescription.displayName = 'CardDescription'

export const CardBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 py-4 text-sm text-text', className)}
      {...tcl('CardBody')}
      {...rest}
    >
      {children}
    </div>
  ),
)
CardBody.displayName = 'CardBody'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2 border-t border-border bg-surface px-5 py-3',
        className,
      )}
      {...tcl('CardFooter')}
      {...rest}
    >
      {children}
    </div>
  ),
)
CardFooter.displayName = 'CardFooter'
