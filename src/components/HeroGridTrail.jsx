import { useEffect, useRef } from 'react'

// Match the 22px tile used by the static hero grid.
const tile = 22
const radius = 48
const lifetime = 560

export default function HeroGridTrail() {
 const canvasRef = useRef(null)

 useEffect(() => {
  const canvas = canvasRef.current
  const hero = canvas.parentElement
  const motion = window.matchMedia?.('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  if (!motion) return

  const cells = new Map()
  let context, frame, pointer, previous, width, height, ratio, bounds

  function stop() {
   if (frame !== undefined) window.cancelAnimationFrame(frame)
   frame = pointer = previous = undefined
   cells.clear()
   context?.clearRect(0, 0, width, height)
  }

  function stamp(x, y, now) {
   for (let row = Math.floor((y - radius) / tile); row <= Math.floor((y + radius) / tile); row++) {
    for (let column = Math.floor((x - radius) / tile); column <= Math.floor((x + radius) / tile); column++) {
     const centerX = (column + 0.5) * tile
     const centerY = (row + 0.5) * tile
     if (centerX < 0 || centerY < 0 || centerX > width || centerY > height) continue
     const strength = 1 - Math.hypot(centerX - x, centerY - y) / radius
     if (strength <= 0) continue
     const key = `${column}:${row}`
     const old = cells.get(key)
     const remaining = old ? old.strength * Math.max(0, 1 - (now - old.time) / lifetime) : 0
     if (strength >= remaining) cells.set(key, { x: centerX, y: centerY, strength, time: now })
    }
   }
  }

  function paint(now) {
   frame = undefined
   if (pointer) {
    bounds = hero.getBoundingClientRect()
    const nextWidth = Math.round(bounds.width)
    const nextHeight = Math.round(bounds.height)
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2)
    if (nextWidth !== width || nextHeight !== height || nextRatio !== ratio) {
     width = nextWidth
     height = nextHeight
     ratio = nextRatio
     canvas.width = Math.round(width * ratio)
     canvas.height = Math.round(height * ratio)
     context.setTransform(ratio, 0, 0, ratio, 0, 0)
     context.lineWidth = 1
     context.strokeStyle = '#b8dcff'
     cells.clear()
     previous = undefined
    }
    const point = { x: pointer.x - bounds.left, y: pointer.y - bounds.top }
    const from = previous ?? point
    const steps = Math.max(1, Math.min(12, Math.ceil(Math.hypot(point.x - from.x, point.y - from.y) / tile)))
    for (let index = 1; index <= steps; index++) {
     const fraction = index / steps
     stamp(from.x + (point.x - from.x) * fraction, from.y + (point.y - from.y) * fraction, now)
    }
    previous = point
    pointer = undefined
   }

   context.clearRect(0, 0, width, height)
   for (const [key, cell] of cells) {
    const life = 1 - (now - cell.time) / lifetime
    if (life <= 0) {
     cells.delete(key)
     continue
    }
    const intensity = life * life * cell.strength
    const size = 18 + 11 * intensity
    context.globalAlpha = 0.62 * intensity
    context.beginPath()
    context.roundRect(cell.x - size / 2, cell.y - size / 2, size, size, 4)
    context.stroke()
   }
   if (cells.size) frame = window.requestAnimationFrame(paint)
  }

  function onMove(event) {
   if (!motion.matches || event.pointerType === 'touch') return
   context ??= canvas.getContext('2d')
   if (!context || !context.roundRect) return
   pointer = { x: event.clientX, y: event.clientY }
   if (frame === undefined) frame = window.requestAnimationFrame(paint)
  }

  function onLeave() {
   pointer = previous = undefined
  }

  function onMotionChange() {
   if (!motion.matches) stop()
  }

  hero.addEventListener('pointermove', onMove, { passive: true })
  hero.addEventListener('pointerleave', onLeave)
  motion.addEventListener('change', onMotionChange)
  return () => {
   stop()
   hero.removeEventListener('pointermove', onMove)
   hero.removeEventListener('pointerleave', onLeave)
   motion.removeEventListener('change', onMotionChange)
  }
 }, [])

 return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full" />
}
