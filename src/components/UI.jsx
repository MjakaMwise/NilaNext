import { useRef } from 'react'
import { NilatextMark } from './NilatextMark'
import { accentStyle } from '../lib/accents'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { AlertBox, Badge } from './ui/feedback'
import { Input, Label } from './ui/form-controls'
import { Table as DataTable, TableBody, TableHead, TableHeader } from './ui/table'

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center text-primary">
        <NilatextMark className="size-6" />
      </span>
      <div>
        <div className="font-semibold tracking-tight">Nilatext</div>
        <div className="text-xs text-muted-foreground">School portal</div>
      </div>
    </div>
  )
}

export function Heading({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Panel({ title, subtitle, action, children, className }) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function Stat({ label, value, detail, icon: Icon, onClick, tone }) {
  return (
    <Card style={tone ? accentStyle(tone) : undefined} className={`gap-3 ${onClick ? 'relative hover:border-ring/50' : ''} ${tone ? 'accent-item' : ''}`}>
      <CardHeader className="items-center text-sm font-medium">
        {onClick ? (
          <Button variant="ghost" className="min-h-0 justify-start p-0 text-left whitespace-normal before:absolute before:inset-0 hover:bg-transparent" onClick={onClick}>
            {label}
          </Button>
        ) : label}
        {Icon && <Icon aria-hidden="true" className={`size-4 shrink-0 ${tone ? 'text-current' : 'text-muted-foreground'}`} />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className={`mt-1 text-xs ${tone ? 'text-current' : 'text-muted-foreground'}`}>{detail}</p>
      </CardContent>
    </Card>
  )
}

export function Empty({ title = 'Nothing here yet', children }) {
  return (
    <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
      <BookOpen aria-hidden="true" className="size-6 text-muted-foreground" />
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

export function Table({ headers, children, empty = false }) {
  return (
    <DataTable>
      <TableHeader>
        <tr>{headers.map(header => <TableHead key={header}>{header}</TableHead>)}</tr>
      </TableHeader>
      <TableBody>
        {children}
        {empty && <tr><td colSpan={headers.length} className="h-20 text-center text-muted-foreground">No matching records.</td></tr>}
      </TableBody>
    </DataTable>
  )
}

export function Pill({ children, tone }) {
  return <Badge variant={tone === 'amber' ? 'warning' : tone === 'neutral' ? 'outline' : 'secondary'}>{children}</Badge>
}

export function Modal({ title, children, onClose, wide = false }) {
  const trigger = useRef(document.activeElement)

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent
        className={wide ? 'max-w-3xl' : undefined}
        aria-describedby={undefined}
        onCloseAutoFocus={event => {
          if (!trigger.current?.isConnected) return
          event.preventDefault()
          trigger.current.focus()
        }}
      >
        <DialogTitle className="min-h-8 pr-12">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function Field({ label, children, ...props }) {
  return (
    <Label className="grid gap-1.5">
      <span>{label}</span>
      {children || <Input {...props} />}
    </Label>
  )
}

export function Actions({ busy, onCancel, label = 'Save changes' }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
      <Button disabled={busy}>{busy ? 'Saving…' : label}<ArrowUpRight size={16} /></Button>
    </div>
  )
}

export function Alert({ children }) {
  return children ? <AlertBox variant="destructive">{children}</AlertBox> : null
}
