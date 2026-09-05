import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { setPanel, usePanel } from './panel-store.ts'

export function FilesButton({ sessionId }: { sessionId: SessionId }) {
  const { open, sessionId: current } = usePanel()
  const active = open && current === sessionId
  return (
    <Button
      size="sm"
      variant={active ? 'primary' : 'ghost'}
      title="Files (flykit)"
      aria-pressed={active}
      onClick={() => setPanel({ open: !active, sessionId })}
    >
      {'{ }'}
    </Button>
  )
}
