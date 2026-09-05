import { useSyncExternalStore } from 'react'

/**
 * The toggle lives in a session-scoped slot, the column in the root overlay.
 * They share this one module-level cell; open state and width persist per browser.
 */
export interface PanelState { open: boolean; width: number; sessionId: string | null }

export const PANEL_MIN = 320
export const PANEL_MAX = 960
const KEY = 'flykit.panel'

function load(): PanelState {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PanelState>
    return { open: j.open === true, width: clamp(j.width ?? 460), sessionId: null }
  } catch { return { open: false, width: 460, sessionId: null } }
}

export function clamp(px: number): number { return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(px))) }

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
  state = { ...state, ...next, width: clamp(next.width ?? state.width) }
  try { localStorage.setItem(KEY, JSON.stringify({ open: state.open, width: state.width })) } catch {}
  reflect()
  for (const l of listeners) l()
}

export function usePanel(): PanelState {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, () => state)
}
