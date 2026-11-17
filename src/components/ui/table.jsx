import { cn } from '../../lib/utils'

export function Table({ className, ...props }) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }) {
  return <thead data-slot="table-header" className={cn('bg-muted/60 [&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={cn('[&_tr]:border-b [&_tr]:transition-colors [&_tr:hover]:bg-muted/50 [&_tr:last-child]:border-0 [&_td]:px-3 [&_td]:py-2', className)} {...props} />
}

export function TableHead({ className, ...props }) {
  return <th data-slot="table-head" scope="col" className={cn('h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-muted-foreground', className)} {...props} />
}
