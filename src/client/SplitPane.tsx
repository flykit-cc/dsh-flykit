import { useRef } from 'react'
import type { ReactNode } from 'react'
import { clampRatio } from './panel-store.ts'

export interface SplitPaneProps {
  /** Top pane's share of the height, 0–1. Ignored unless `mode` is 'split'. */
  ratio: number
  onRatio: (ratio: number) => void
  label: string
  top: ReactNode
  bottom: ReactNode
  /**
   * 'split' shows both; 'top' / 'bottom' show one full height and hide the other.
   * Hiding rather than unmounting is the point: the panes keep their own state
   * (open editor tabs, live xterm instances) across a toggle.
   */
  mode?: 'split' | 'top' | 'bottom'
}

/**
 * Two stacked panes with a draggable divider. Same pointer-capture dance as the
 * panel's own edge handle, so a drag survives the pointer leaving the strip.
 */
export function SplitPane({ ratio, onRatio, label, top, bottom, mode = 'split' }: SplitPaneProps) {
  const host = useRef<HTMLDivElement>(null)
  const split = mode === 'split'
  const fill = { flex: 1, height: 'auto' } as const

  return (
    <div className="flykit-split" ref={host}>
      <div className="flykit-split-pane" hidden={mode === 'bottom'} style={split ? { height: `${ratio * 100}%` } : fill}>{top}</div>
      {split && (
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
      )}
      <div className="flykit-split-pane flykit-split-rest" hidden={mode === 'top'}>{bottom}</div>
    </div>
  )
}
