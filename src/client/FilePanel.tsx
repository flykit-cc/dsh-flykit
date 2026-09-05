import { useRef, useState } from 'react'
import { Explorer } from './Explorer.tsx'
import { CloseIcon, SplitIcon } from './icons.tsx'
import { setPanel, usePanel } from './panel-store.ts'
import { SplitPane } from './SplitPane.tsx'
import { Terminals } from './Terminals.tsx'

/** Left-edge resize strip: pointer capture, width written straight to the store. */
function ResizeHandle() {
  const { width } = usePanel()
  const base = useRef({ x: 0, w: 0 })
  return (
    <div
      className="flykit-panel-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onPointerDown={e => {
        base.current = { x: e.clientX, w: width }
        e.currentTarget.setPointerCapture(e.pointerId)
        document.body.dataset.flykitDragging = ''
      }}
      onPointerMove={e => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        setPanel({ width: base.current.w + (base.current.x - e.clientX) })
      }}
      onPointerUp={e => { e.currentTarget.releasePointerCapture(e.pointerId); delete document.body.dataset.flykitDragging }}
    />
  )
}

const TABS = [{ id: 'files', label: 'Explorer' }, { id: 'terms', label: 'Agents' }] as const

/** Root-overlay entry: the right column, rendered only while the toggle has it open. */
export function FilePanel() {
  const { open, sessionId, split, splitRatio } = usePanel()
  const [tab, setTab] = useState<typeof TABS[number]['id']>('files')
  if (!open || sessionId === null) return null
  return (
    <aside className="flykit-panel" aria-label="flykit panel">
      <ResizeHandle />
      <div className="flykit-panel-head">
        {split
          ? <span className="flykit-head-title">flykit</span>
          : (
            <div className="flykit-tabs" role="tablist">
              {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
          )}
        <div className="flykit-head-actions">
          <button
            type="button"
            className="flykit-headbtn"
            title={split ? 'Show one at a time' : 'Show Agents and Explorer together'}
            aria-label="Split view"
            aria-pressed={split}
            onClick={() => setPanel({ split: !split })}
          >
            <SplitIcon on={split} />
          </button>
          <button type="button" className="flykit-headbtn" aria-label="Close panel" onClick={() => setPanel({ open: false })}><CloseIcon /></button>
        </div>
      </div>
      <div className="flykit-panel-body">
        {split
          ? (
            <SplitPane
              ratio={splitRatio}
              onRatio={r => setPanel({ splitRatio: r })}
              label="Resize Agents pane"
              top={<Terminals sessionId={sessionId} />}
              bottom={<Explorer sessionId={sessionId} />}
            />
          )
          : tab === 'files' ? <Explorer sessionId={sessionId} /> : <Terminals sessionId={sessionId} />}
      </div>
    </aside>
  )
}
