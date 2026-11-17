import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/utils'

export const Dialog = DialogPrimitive.Root

export function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function DialogContent({ className, children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-40 bg-black/45" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn('fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto overscroll-contain rounded-xl border bg-card p-6 shadow-lg outline-none', className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Close dialog" className="absolute top-3 right-3 text-muted-foreground">
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
