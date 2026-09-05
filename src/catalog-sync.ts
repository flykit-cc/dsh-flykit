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
  const contextWindow = Math.max(1, Math.floor(m.context_length ?? 32_768))
  return {
    id: m.id,
    name: m.name,
    contextWindow,
    maxTokens: Math.max(1, Math.min(contextWindow, Math.floor(m.top_provider?.max_completion_tokens ?? DEFAULT_MAX_TOKENS))),
    input: input.length === 0 ? ['text'] : input,
    // ponytail: no reasoningEfforts here. The adapter merges its own reasoning map under a
    // known id (a wrong map made DeepSeek V4 reject "reasoning off"); unknown models
    // run on the provider default until pi-ai ships their entry.
  }
}

export async function fetchOpenRouter(signal?: AbortSignal): Promise<ModelProfile[]> {
  const r = await fetch('https://openrouter.ai/api/v1/models', { signal: signal ?? AbortSignal.timeout(15_000), headers: { 'user-agent': 'dsh-flykit' } })
  if (!r.ok) throw new Error(`openrouter models: http ${r.status}`)
  const j = await r.json() as { data?: OpenRouterModel[] }
  return (j.data ?? []).filter(m => typeof m.id === 'string' && m.id !== '').map(fromOpenRouter)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * DeepSeek's own platform API. It answers ids only — no context window, no
 * modalities — and today it names exactly the three the adapter already ships,
 * so this reports rather than writes: a settings write would have to invent the
 * metadata the adapter's defaults carry, and would drop their descriptions.
 * ponytail: report-only. Turn it into a write once DeepSeek serves metadata,
 * or once /models returns an id the adapter does not know.
 */
export async function fetchDeepSeekIds(apiKey: string, baseURL = 'https://api.deepseek.com', signal?: AbortSignal): Promise<string[]> {
  const r = await fetch(`${baseURL.replace(/\/+$/, '')}/models`, {
    signal: signal ?? AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${apiKey}`, 'user-agent': 'dsh-flykit' },
  })
  if (!r.ok) throw new Error(`deepseek models: http ${r.status}`)
  const j = await r.json() as { data?: { id?: unknown }[] }
  return (j.data ?? []).map(m => m.id).filter((id): id is string => typeof id === 'string' && id !== '').sort()
}
