import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

const layouts = {
  Overview: 'dashboard',
  Classes: 'cards',
  Fees: 'summary-table',
  'People & access': 'stack',
  'School settings': 'stack',
  Curriculum: 'stack',
  Assignments: 'stack',
}

function SummaryCards({ count = 3, dashboard = false }) {
  return (
    <div className={dashboard ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "grid gap-3 sm:grid-cols-3"}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="gap-3 p-5">
          <Skeleton className="h-4 w-24 max-w-full" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32 max-w-full" />
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5 }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex gap-4 bg-muted px-4 py-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="ml-auto h-4 w-16" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-w-0 items-center gap-4 border-t px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-36 min-w-0" />
          <Skeleton className="ml-auto h-4 w-20 shrink-0" />
        </div>
      ))}
    </Card>
  )
}

export function LoadingState({ page, label, nested = false, role }) {
  const layout = layouts[page] ?? 'table'
  return (
    <div data-loading={page || 'records'}>
      <span role="status" className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4">
        {!nested && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-52 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        )}
        {layout === 'dashboard' && (
          <Card className="gap-4 p-5">
            <Skeleton className="h-5 w-24" />
            <div className="grid gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3">
              {Array.from({ length: role === 'teacher' ? 4 : role === 'parent' || role === 'student' ? 3 : 6 }, (_, index) => (
                <Skeleton key={index} className="h-11" />
              ))}
            </div>
          </Card>
        )}
        {layout === 'dashboard' && <SummaryCards dashboard count={role === 'parent' || role === 'student' ? 3 : 4} />}
        {['cards', 'summary-table'].includes(layout) && <SummaryCards />}
        {['table', 'summary-table'].includes(layout) && <TableSkeleton rows={nested ? 3 : 5} />}
        {layout === 'dashboard' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <TableSkeleton rows={3} />
            <TableSkeleton rows={3} />
          </div>
        )}
        {layout === 'stack' && (
          <div className="grid gap-3">
            <TableSkeleton rows={2} />
            <TableSkeleton rows={2} />
          </div>
        )}
      </div>
    </div>
  )
}
