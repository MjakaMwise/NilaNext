import { useRef, useState } from 'react'

const paneSizes = {
  navigation: { min: 200, initial: 240, max: 320 },
  workspace: { min: 208, initial: 248, max: 340 },
}

function ResizeHandle({ pane, label, side, size, onResize, className }) {
  const drag = useRef(null)
  const { min, max, initial } = paneSizes[pane]
  const direction = side === 'right' ? -1 : 1

  function changeSize(value) {
    onResize(Math.max(min, Math.min(max, value)))
  }

  return (
    <div
      role="separator"
      aria-label={label}
      aria-controls={`pane-${pane}`}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={size}
      aria-valuetext={`${size} pixels`}
      tabIndex={0}
      className={`workspace-divider relative cursor-col-resize touch-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return
        event.currentTarget.focus({ preventScroll: true })
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointerId: event.pointerId, x: event.clientX, size }
      }}
      onPointerMove={event => {
        if (drag.current?.pointerId === event.pointerId) changeSize(drag.current.size + direction * (event.clientX - drag.current.x))
      }}
      onLostPointerCapture={() => { drag.current = null }}
      onDoubleClick={() => changeSize(initial)}
      onKeyDown={event => {
        const step = event.shiftKey ? 32 : 8
        const next = {
          ArrowLeft: size - direction * step,
          ArrowRight: size + direction * step,
          Home: min,
          End: max,
        }[event.key]
        if (next === undefined) return
        event.preventDefault()
        changeSize(next)
      }}
    />
  )
}

export function ResizableWorkspace({ navigation, navigationCollapsed = false, workspace, children }) {
  const [leftWidth, setLeftWidth] = useState(paneSizes.navigation.initial)
  const [rightWidth, setRightWidth] = useState(paneSizes.workspace.initial)

  return (
    <div className="portal-workspace min-h-svh" style={{ '--navigation-width': navigationCollapsed ? '72px' : `${leftWidth}px`, '--workspace-width': `${rightWidth}px` }}>
      {navigation}
      {!navigationCollapsed && <ResizeHandle pane="navigation" label="Resize navigation pane" side="left" size={leftWidth}
        onResize={setLeftWidth} className="navigation-divider hidden lg:block" />}
      {workspace}
      {children}
      <ResizeHandle pane="workspace" label="Resize term controls pane" side="right" size={rightWidth}
        onResize={setRightWidth} className="workspace-tools-divider hidden xl:block" />
    </div>
  )
}
