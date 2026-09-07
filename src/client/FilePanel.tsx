import { useRef } from 'react'
import { Apps } from './Apps.tsx'
import { Explorer } from './Explorer.tsx'
import { CloseIcon, MaxIcon, SplitIcon } from './icons.tsx'
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

const TABS = [{ id: 'files', label: 'Explorer' }, { id: 'terms', label: 'Agents' }, { id: 'apps', label: 'Apps' }] as const

/** Root-overlay entry: the right column, rendered only while the toggle has it open. */
export function FilePanel() {
  const { open, sessionId, split, splitRatio, max, tab } = usePanel()
  const appsSeen = useRef(false)
  if (tab === 'apps') appsSeen.current = true
  if (!open || sessionId === null) return null
  return (
    <aside className="flykit-panel" aria-label="flykit panel" data-max={max || undefined}>
      {!max && <ResizeHandle />}
      <div className="flykit-panel-head">
        <div className="flykit-tabs" role="tablist" data-split={split || undefined}>
          {/* Split shows Explorer and Agents together, so both names read as active; a click still picks the one to focus when split ends. Apps sits over that pair. */}
          {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id || (split && tab !== 'apps' && t.id !== 'apps')} onClick={() => setPanel({ tab: t.id })}>{t.label}</button>)}
        </div>
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
          {/* At full width the session header is off-screen, so this is the only way back. */}
          <button
            type="button"
            className="flykit-headbtn"
            title={max ? 'Restore panel width' : 'Fill the window'}
            aria-label="Maximise panel"
            aria-pressed={max}
            onClick={() => setPanel({ max: !max })}
          >
            <MaxIcon on={max} />
          </button>
          <button type="button" className="flykit-headbtn" aria-label="Close panel" onClick={() => setPanel({ open: false })}><CloseIcon /></button>
        </div>
      </div>
      <div className="flykit-panel-body">
        {/* One mount point for both views. Toggling split or tabs only hides a pane,
            so editor tabs and live terminals survive the switch. */}
        <div className="flykit-pair" hidden={tab === 'apps'}>
          <SplitPane
            mode={split ? 'split' : tab === 'files' ? 'bottom' : 'top'}
            ratio={splitRatio}
            onRatio={r => setPanel({ splitRatio: r })}
            label="Resize Agents pane"
            top={<Terminals sessionId={sessionId} />}
            bottom={<Explorer sessionId={sessionId} />}
          />
        </div>
        {/* Mounted from the first visit on, so the WhatsApp screencast survives a tab switch. */}
        {appsSeen.current && <Apps hidden={tab !== 'apps'} />}
      </div>
    </aside>
  )
}
