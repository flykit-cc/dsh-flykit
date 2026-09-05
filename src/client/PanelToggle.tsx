import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { PanelIcon } from './icons.tsx'
import { setPanel, usePanel } from './panel-store.ts'

/** Session-header capsule that opens or closes the flykit column, like the sidebar toggle. */
export function PanelToggle({ sessionId }: { sessionId: SessionId }) {
  const { open } = usePanel()
  return (
    <button
      type="button"
      className="flykit-toggle"
      title={open ? 'Close flykit panel' : 'Open flykit panel'}
      aria-pressed={open}
      onClick={() => setPanel({ open: !open, sessionId })}
    >
      <PanelIcon open={open} />
    </button>
  )
}
