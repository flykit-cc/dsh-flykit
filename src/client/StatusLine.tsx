import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { UseProjection, SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: merges useSession / sessionId / useProjection into the slot's standard props.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: merge the contextPressure key into SessionProjectionMap.
import type {} from '@deepseek-ai/dsh-token-meter/client'
import { buildSegments, ringToken } from './segments.ts'
import type { StatusFacts } from './segments.ts'

export interface StatusLineProps {
  useSession: SnapshotSelectorHook<SessionSnapshot>
  useChat: SnapshotSelectorHook<ChatSnapshot>
  useProjection: UseProjection
  sessionId: SessionId
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

/** Wall-clock ms, re-read once a second only while a turn is open. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => { setNow(Date.now()) }, 1000)
    return () => { clearInterval(id) }
  }, [active])
  return now
}

/** The session's repo, re-read on session change and after each settled node. */
function useGit(sessionId: SessionId, tick: number): StatusFacts['git'] {
  const [git, setGit] = useState<StatusFacts['git']>(undefined)
  useEffect(() => {
    const ac = new AbortController()
    // A turn settles many nodes in a burst; one reading per burst is enough.
    const timer = setTimeout(() => {
      fetch(`/api/flykit/git?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store', signal: ac.signal })
        .then(r => r.json())
        .then((j: { branch?: string | null; dirty?: number }) => {
          setGit(j.branch === undefined ? undefined : { branch: j.branch, dirty: j.dirty ?? 0 })
        })
        .catch(() => {})  // aborted or offline: keep the last reading
    }, 400)
    return () => { clearTimeout(timer); ac.abort() }
  }, [sessionId, tick])
  return git
}

/**
 * Recolour the shell's context ring by occupancy through one CSS variable.
 * It goes on `body`, not `:root`: the --dsw-* tokens are declared under `body`,
 * so a var() referencing one is invalid at computed-value time on `<html>`.
 */
function useRing(percent: number | null): void {
  useEffect(() => {
    const token = ringToken(percent)
    const host = document.body
    if (token === null) { host.style.removeProperty('--flykit-ring'); return }
    host.style.setProperty('--flykit-ring', `var(${token})`)
    return () => { host.style.removeProperty('--flykit-ring') }
  }, [percent])
}

export function StatusLine({ useSession, useChat, useProjection, sessionId }: StatusLineProps) {
  const running = useSession(s => s.running)
  const tool = useChat(s => s.legacy.runningCalls[0]?.name)
  const startedAt = useChat(s => {
    for (const t of s.legacy.turnTimings.values()) if (t.endTime === undefined) return t.startTime
    return null
  })

  const now = useNow(running && startedAt !== null)
  const git = useGit(sessionId, useChat(s => s.legacy.nodes.length))

  const { projectedTokens, contextWindow } = useProjection('contextPressure') ?? {}
  const percent = projectedTokens !== undefined && contextWindow !== undefined && contextWindow > 0
    ? Math.round((projectedTokens / contextWindow) * 100)
    : null
  useRing(percent)

  const line = buildSegments({
    running, tool, git,
    elapsedMs: startedAt === null ? null : now - startedAt,
  }).join(' │ ')
  return <div style={style} title={line}>{line}</div>
}
