import { useSyncExternalStore } from 'react'

/**
 * The button lives in a session-scoped slot, the drawer in the root overlay.
 * They share this one module-level cell instead of any framework state.
 */
export interface PanelState { open: boolean; sessionId: string | null }

let state: PanelState = { open: false, sessionId: null }
const listeners = new Set<() => void>()

export function setPanel(next: Partial<PanelState>): void {
  state = { ...state, ...next }
  for (const l of listeners) l()
}

export function usePanel(): PanelState {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, () => state)
}
