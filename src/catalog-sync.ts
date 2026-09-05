/**
 * Live model catalogs. The harness's pi-ai adapter ships a static OpenRouter
 * list (333 models at 0.1.2-rc.1, versus 431 live), and its `models` config
 * key replaces that list wholesale. So: fetch the live list, shape it to the
 * adapter's model profile, and write it into the user's settings through the
 * settings service, which the adapter reloads without a restart.
 */

export interface ModelProfile {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  input: ('text' | 'image')[]
  reasoningEfforts?: Record<string, string | null>
}

interface OpenRouterModel {
  id: string
  name: string
  context_length?: number | null
  top_provider?: { max_completion_tokens?: number | null } | null
  architecture?: { input_modalities?: string[] | null } | null
  supported_parameters?: string[] | null
}

const DEFAULT_MAX_TOKENS = 8_192

/** Shape one OpenRouter record into the adapter's model profile. */
export function fromOpenRouter(m: OpenRouterModel): ModelProfile {
  const input = (m.architecture?.input_modalities ?? ['text']).filter((x): x is 'text' | 'image' => x === 'text' || x === 'image')
  const reasoning = (m.supported_parameters ?? []).some(p => p === 'reasoning' || p === 'reasoning_effort' || p === 'include_reasoning')
  const contextWindow = Math.max(1, Math.floor(m.context_length ?? 32_768))
  return {
    id: m.id,
    name: m.name,
    contextWindow,
    maxTokens: Math.max(1, Math.min(contextWindow, Math.floor(m.top_provider?.max_completion_tokens ?? DEFAULT_MAX_TOKENS))),
    input: input.length === 0 ? ['text'] : input,
    // OpenRouter accepts reasoning.effort low|medium|high; `off` sends nothing.
    ...(reasoning ? { reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' } } : {}),
  }
}

export async function fetchOpenRouter(signal?: AbortSignal): Promise<ModelProfile[]> {
  const r = await fetch('https://openrouter.ai/api/v1/models', { signal: signal ?? AbortSignal.timeout(15_000), headers: { 'user-agent': 'dsh-flykit' } })
  if (!r.ok) throw new Error(`openrouter models: http ${r.status}`)
  const j = await r.json() as { data?: OpenRouterModel[] }
  return (j.data ?? []).filter(m => typeof m.id === 'string' && m.id !== '').map(fromOpenRouter)
    .sort((a, b) => a.name.localeCompare(b.name))
}
