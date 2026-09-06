import { useSyncExternalStore } from 'react'

/**
 * The toggle lives in a session-scoped slot, the column in the root overlay.
 * They share this one module-level cell; layout state persists per browser.
 */
export interface PanelState {
  open: boolean
  width: number
  sessionId: string | null
  /** Stacked layout: Agents above, Explorer below, instead of the tab strip. */
  split: boolean
  /** Full window width; the shell frame shrinks to nothing behind it. */
  max: boolean
  /** Agents tab shows every terminal at once instead of only the focused one. */
  grid: boolean
  /** Agents' share of the panel body height while split. */
  splitRatio: number
  /** The file tree's share of the Explorer height. */
  treeRatio: number
  /** Which pane shows while not split. */
  tab: 'files' | 'terms'
}

export const PANEL_MIN = 320
export const PANEL_MAX = 960
const KEY = 'flykit.panel'

/** Persisted keys; `sessionId` is per-tab and never written. */
type Saved = Omit<PanelState, 'sessionId'>

const DEFAULTS: PanelState = { open: false, width: 460, sessionId: null, split: false, max: false, grid: false, splitRatio: 0.5, treeRatio: 0.38, tab: 'files' }

function load(): PanelState {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>
    return {
      ...DEFAULTS,
      open: j.open === true,
      width: clamp(j.width ?? DEFAULTS.width),
      split: j.split === true,
      max: j.max === true,
      grid: j.grid === true,
      splitRatio: clampRatio(j.splitRatio ?? DEFAULTS.splitRatio),
      treeRatio: clampRatio(j.treeRatio ?? DEFAULTS.treeRatio),
      tab: j.tab === 'terms' ? 'terms' : 'files',
    }
  } catch { return { ...DEFAULTS } }
}

export function clamp(px: number): number { return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(px))) }

/** Both panes stay usable: neither side of a divider drops below 12%. */
export function clampRatio(r: number): number { return Math.min(0.88, Math.max(0.12, r)) }

let state = load()
const listeners = new Set<() => void>()

/**
 * The frame shrinks by this CSS var (styles.ts); it lives on body like every --dsw-* token.
 * Maximised it is `100%`, which reads correctly in both consumers: the frame's own
 * `calc(100% - …)` collapses to zero, and the fixed panel spans the viewport.
 */
function reflect(): void {
  if (typeof document === 'undefined') return  // loader self-check runs in bare node
  const b = document.body
  b.style.setProperty('--flykit-panel-w', !state.open ? '0px' : state.max ? '100%' : `${state.width}px`)
  if (state.open) b.dataset.flykitPanel = ''
  else delete b.dataset.flykitPanel
}
reflect()

export function setPanel(next: Partial<PanelState>): void {
  state = {
    ...state,
    ...next,
    width: clamp(next.width ?? state.width),
    splitRatio: clampRatio(next.splitRatio ?? state.splitRatio),
    treeRatio: clampRatio(next.treeRatio ?? state.treeRatio),
  }
  const { sessionId: _drop, ...saved } = state
  try { localStorage.setItem(KEY, JSON.stringify(saved satisfies Saved)) } catch {}
  reflect()
  for (const l of listeners) l()
}

export function usePanel(): PanelState {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, () => state)
}
