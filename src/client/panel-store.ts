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
  /** Agents' share of the panel body height while split. */
  splitRatio: number
  /** The file tree's share of the Explorer height. */
  treeRatio: number
}

export const PANEL_MIN = 320
export const PANEL_MAX = 960
const KEY = 'flykit.panel'

/** Persisted keys; `sessionId` is per-tab and never written. */
type Saved = Omit<PanelState, 'sessionId'>

const DEFAULTS: PanelState = { open: false, width: 460, sessionId: null, split: false, splitRatio: 0.5, treeRatio: 0.38 }

function load(): PanelState {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>
    return {
      ...DEFAULTS,
      open: j.open === true,
      width: clamp(j.width ?? DEFAULTS.width),
      split: j.split === true,
      splitRatio: clampRatio(j.splitRatio ?? DEFAULTS.splitRatio),
      treeRatio: clampRatio(j.treeRatio ?? DEFAULTS.treeRatio),
    }
  } catch { return { ...DEFAULTS } }
}

export function clamp(px: number): number { return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(px))) }

/** Both panes stay usable: neither side of a divider drops below 12%. */
export function clampRatio(r: number): number { return Math.min(0.88, Math.max(0.12, r)) }

let state = load()
const listeners = new Set<() => void>()

/** The frame shrinks by this CSS var (styles.ts); it lives on body like every --dsw-* token. */
function reflect(): void {
  if (typeof document === 'undefined') return  // loader self-check runs in bare node
  const b = document.body
  b.style.setProperty('--flykit-panel-w', `${state.open ? state.width : 0}px`)
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
