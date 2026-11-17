import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const control = 'w-full rounded-md border border-input bg-card px-3 py-2 text-base shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 md:text-sm'

export function Input({ className, ...props }) {
  return <input data-slot="input" className={cn(control, 'min-h-11 min-w-0', className)} {...props} />
}

export function Textarea({ className, ...props }) {
  return <textarea data-slot="textarea" className={cn(control, 'min-h-24', className)} {...props} />
}

export function NativeSelect({ className, children, ...props }) {
  return (
    <span data-slot="native-select-wrapper" className="relative inline-flex min-w-0">
      <select data-slot="native-select" className={cn(control, 'min-h-11 appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  )
}

export function Label({ className, ...props }) {
  return <label data-slot="label" className={cn('text-sm font-medium', className)} {...props} />
}
