import type { CSSProperties } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { UseProjection, SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
// Type-only: merges useSession / useProjection into the slot's standard props.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: merge the modelSelection / tokenUsage / contextPressure keys into
// SessionProjectionMap so useProjection('…') typechecks.
import type {} from '@deepseek-ai/dsh-token-meter/client'
import { buildSegments } from './segments.ts'

export interface StatusLineProps {
  useSession: SnapshotSelectorHook<SessionSnapshot>
  useChat: SnapshotSelectorHook<ChatSnapshot>
  useProjection: UseProjection
}

const style: CSSProperties = {
  display: 'block',
  textAlign: 'center',
  maxWidth: 'var(--dsh-chat-content-width)',
  width: '100%',
  margin: '0 auto',
  boxSizing: 'border-box',
  padding: '2px calc(var(--dsh-composer-side-clearance) + 16px) 0',
  fontFamily: 'var(--dsw-font-mono, ui-monospace, monospace)',
  fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
  color: 'var(--dsw-alias-label-tertiary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export function StatusLine({ useSession, useChat, useProjection }: StatusLineProps) {
  const running = useSession(s => s.running)
  const streaming = useChat(s => s.legacy.partial !== null)
  const tool = useChat(s => s.legacy.runningCalls[0]?.name)
  const model = useProjection('modelSelection')?.lastUsed
  const usage = useProjection('tokenUsage')
  const pressure = useProjection('contextPressure')
  const line = buildSegments({ running, streaming, tool, model, usage, pressure }).join(' · ')
  return <div style={style} title={line}>{line}</div>
}
