import { useEffect } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { PanelIcon } from './icons.tsx'
import { setPanel, usePanel } from './panel-store.ts'

/** Session-header capsule that opens or closes the flykit column, like the sidebar toggle. */
export function PanelToggle({ sessionId }: { sessionId: SessionId }) {
  const { open } = usePanel()
  // This slot remounts per session, so it is the one place that knows the current workspace.
  useEffect(() => {
    setPanel({ sessionId })
    return () => { setPanel({ sessionId: null }) }
  }, [sessionId])
  return (
    <button
      type="button"
      className="flykit-toggle"
      title={open ? 'Close flykit panel' : 'Open flykit panel'}
      aria-pressed={open}
      onClick={() => setPanel({ open: !open })}
    >
      <PanelIcon open={open} />
    </button>
  )
}
