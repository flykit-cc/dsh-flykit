import { useRef } from 'react'
import type { ReactNode } from 'react'
import { clampRatio } from './panel-store.ts'

export interface SplitPaneProps {
  /** Top pane's share of the height, 0–1. */
  ratio: number
  onRatio: (ratio: number) => void
  label: string
  top: ReactNode
  bottom: ReactNode
}

/**
 * Two stacked panes with a draggable divider. Same pointer-capture dance as the
 * panel's own edge handle, so a drag survives the pointer leaving the strip.
 */
export function SplitPane({ ratio, onRatio, label, top, bottom }: SplitPaneProps) {
  const host = useRef<HTMLDivElement>(null)

  return (
    <div className="flykit-split" ref={host}>
      <div className="flykit-split-pane" style={{ height: `${ratio * 100}%` }}>{top}</div>
      <div
        className="flykit-split-bar"
        role="separator"
        aria-orientation="horizontal"
        aria-label={label}
        aria-valuenow={Math.round(ratio * 100)}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          document.body.dataset.flykitDraggingRow = ''
        }}
        onPointerMove={e => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          const box = host.current?.getBoundingClientRect()
          if (box === undefined || box.height === 0) return
          onRatio(clampRatio((e.clientY - box.top) / box.height))
        }}
        onPointerUp={e => {
          e.currentTarget.releasePointerCapture(e.pointerId)
          delete document.body.dataset.flykitDraggingRow
        }}
      />
      <div className="flykit-split-pane flykit-split-rest">{bottom}</div>
    </div>
  )
}
