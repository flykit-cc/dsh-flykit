export interface StatusFacts {
  running: boolean
  streaming: boolean
  tool: string | undefined
  model: { provider: string; model: string } | null | undefined
  usage: { uncachedInputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number } | undefined
  pressure: { projectedTokens?: number; contextWindow?: number } | undefined
}

export function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function stateSegment(f: StatusFacts): string {
  if (!f.running) return '● idle'
  if (f.tool !== undefined) return `● running ${f.tool}`
  return '● thinking…'
}

// One segment per fact. An absent fact (undefined projection, null model,
// zero tokens, missing window) contributes nothing rather than a placeholder.
export function buildSegments(f: StatusFacts): string[] {
  const out = [stateSegment(f)]
  if (f.model) out.push(`${f.model.provider}/${f.model.model}`)
  if (f.usage) {
    const inTokens = f.usage.uncachedInputTokens + f.usage.cacheReadTokens
    if (inTokens > 0 || f.usage.outputTokens > 0) {
      out.push(`${formatK(inTokens)} in / ${formatK(f.usage.outputTokens)} out`)
    }
  }
  const { projectedTokens, contextWindow } = f.pressure ?? {}
  if (projectedTokens !== undefined && contextWindow !== undefined && contextWindow > 0) {
    out.push(`ctx ${Math.round((projectedTokens / contextWindow) * 100)}%`)
  }
  return out
}
