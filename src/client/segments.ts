export interface StatusFacts {
  running: boolean
  tool: string | undefined
  elapsedMs: number | null
  git: { branch: string | null; dirty: number } | undefined
}

/** `<n>s` below a minute, `<m>mss s` from a minute on: 65000 → `1m05s`. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  if (total < 60) return `${total}s`
  return `${Math.floor(total / 60)}m${String(total % 60).padStart(2, '0')}s`
}

function stateSegment(f: StatusFacts): string {
  if (!f.running) return '● idle'
  const state = f.tool === undefined ? '● thinking…' : `● running ${f.tool}`
  return f.elapsedMs === null ? state : `${state} · ${formatElapsed(f.elapsedMs)}`
}

// One segment per fact. An absent fact (no turn running, git route absent,
// not a repo) contributes nothing rather than a placeholder.
export function buildSegments(f: StatusFacts): string[] {
  const out = [stateSegment(f)]
  const git = f.git
  if (git !== undefined && git.branch !== null) {
    out.push(git.dirty > 0 ? `${git.branch} *${git.dirty}` : git.branch)
  }
  return out
}

/** The `--dsw-*` token the context ring takes at a given occupancy. */
export function ringToken(percent: number | null): string | null {
  if (percent === null) return null
  if (percent < 60) return '--dsw-alias-state-success-primary'
  if (percent < 85) return '--dsw-alias-state-warn-primary'
  return '--dsw-alias-state-error-primary'
}
