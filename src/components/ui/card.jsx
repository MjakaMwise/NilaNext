import { cn } from '../../lib/utils'

export function Card({ className, ...props }) {
  return <section data-slot="card" className={cn('flex min-w-0 flex-col gap-5 rounded-xl border bg-card py-5 text-card-foreground shadow-xs', className)} {...props} />
}

export function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn('flex items-start justify-between gap-3 px-5', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h2 data-slot="card-title" className={cn('font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn('min-w-0 px-5', className)} {...props} />
}
