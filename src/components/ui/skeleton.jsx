import { cn } from '../../lib/utils'

export function Skeleton({ className }) {
  return <div aria-hidden="true" data-slot="skeleton" className={cn('rounded-md bg-accent', className)} />
}
