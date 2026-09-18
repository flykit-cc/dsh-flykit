/**
 * Live model catalogs, one row per provider.
 *
 * Every LLM adapter here ships a frozen model list, and each one's `models`
 * config key replaces that list wholesale — so a model a provider shipped last
 * week stays invisible until someone edits settings by hand. A bigger frozen
 * list is not the fix. Reading the provider's own listing and writing it into
 * the user's settings through the settings service is: the adapter reloads it
 * without a restart.
 *
 * `TARGETS` is that mapping, and adding a provider is a row rather than a code
 * path. Nearly every endpoint answers OpenAI's `GET /models` shape — official
 * APIs, gateways and self-hosted servers alike — so an OpenAI-compatible route
 * needs only its namespace, its base URL and its credential ref. A bespoke
 * shaper is warranted only when a provider discloses more than ids.
 *
 * A section that exists in settings is the opt-in: this never invents a
 * namespace nobody configured, and never writes a listing that looks like a
 * stub. `extraTargets` covers the rest — any `llm-pi-ai` provider that names
 * its own `baseURL` is picked up with no code change at all, which is the
 * common shape for a gateway or a self-hosted server added later.
 *
 * ponytail: the listing is our only evidence of *existence*, so a target
 * mirrors it rather than merging — a model the provider dropped stops being
 * offered. Metadata is the opposite problem: `/models` discloses it for
 * OpenRouter and not at all for DeepSeek, which is what `known` is for. We
 * never invent a field a listing did not supply; the adapter's own
 * section-level default is the honest answer for those.
 */

export interface ModelProfile {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  input: ('text' | 'image')[]
}

/** A model as a provider's own listing describes it — ids alone, for most. */
export interface DiscoveredModel {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
  input?: ('text' | 'image')[]
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

/**
 * Shape one OpenRouter record into the adapter's model profile.
 *
 * This doubles as the generic shaper: a plain OpenAI `/models` record carries
 * a bare id and nothing else, and every field here already falls back to a
 * conservative value, so such a route degrades to ids-only text models rather
 * than failing.
 */
export function fromOpenRouter(m: OpenRouterModel): ModelProfile {
  const input = (m.architecture?.input_modalities ?? ['text']).filter((x): x is 'text' | 'image' => x === 'text' || x === 'image')
  const contextWindow = Math.max(1, Math.floor(m.context_length ?? 32_768))
  return {
    id: m.id,
    name: m.name ?? m.id,
    contextWindow,
    maxTokens: Math.max(1, Math.min(contextWindow, Math.floor(m.top_provider?.max_completion_tokens ?? DEFAULT_MAX_TOKENS))),
    input: input.length === 0 ? ['text'] : input,
    // ponytail: no reasoningEfforts here. The adapter merges its own reasoning map under a
    // known id (a wrong map made DeepSeek V4 reject "reasoning off"); unknown models
    // run on the provider default until pi-ai ships their entry.
  }
}

/**
 * Metadata DeepSeek's own listing does not disclose.
 *
 * `/models` answers ids only, so context window and output ceiling are left to
 * the adapter's section defaults — which already match the published 1M / 384K
 * and stay right when the adapter revises them. What cannot be inherited is the
 * display name and whether the model takes images, and getting the latter wrong
 * is what would cost us vision.
 */
const DEEPSEEK_KNOWN: Record<string, Omit<DiscoveredModel, 'id'>> = {
  'deepseek-flash': { name: 'DeepSeek-V4.1-Flash', input: ['text', 'image'] },
  'deepseek-v4-pro': { name: 'DeepSeek-V4-Pro-0813', input: ['text'] },
}

/** Which adapter's entry shape a section wants written. */
export type Flavor = 'pi-ai' | 'deepseek'

/** Protocols whose model listing is OpenAI's `GET /models` shape. */
const LISTABLE_PROTOCOLS = new Set(['openai-completions', 'openai-responses'])

export interface CatalogTarget {
  /** Name used in the sync note. */
  label: string
  /** Settings namespace holding the adapter's section. */
  ns: string
  /** Path to the model array inside that section. */
  path: string[]
  /** Used when the section does not name its own endpoint. */
  defaultBaseURL: string
  /** Credential ref used when the section does not name its own. */
  defaultApiKeyEnv: string
  flavor: Flavor
  /** A listing smaller than this is a stub: reported, never written. */
  floor: number
  /** Metadata the listing omits, by model id. */
  known?: Record<string, Omit<DiscoveredModel, 'id'>>
}

/**
 * Providers whose catalog should track their live listing.
 *
 * `floor` guards against replacing a good list with a stub, and the two
 * numbers differ because the two endpoints do: OpenRouter has never served
 * fewer than fifty models, while DeepSeek's own API answers with a handful.
 * Sharing one floor would either write stubs for OpenRouter or refuse to sync
 * DeepSeek at all.
 */
export const TARGETS: CatalogTarget[] = [
  {
    label: 'openrouter',
    ns: 'llm-pi-ai',
    path: ['providers', 'openrouter', 'models'],
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    defaultApiKeyEnv: 'OPENROUTER_API_KEY',
    flavor: 'pi-ai',
    floor: 50,
  },
  {
    label: 'deepseek',
    ns: 'llm-deepseek',
    path: ['models'],
    defaultBaseURL: 'https://api.deepseek.com',
    defaultApiKeyEnv: 'DEEPSEEK_API_KEY',
    flavor: 'deepseek',
    floor: 1,
    known: DEEPSEEK_KNOWN,
  },
]

/**
 * Targets for `llm-pi-ai` providers beyond the explicit rows.
 *
 * A provider that carries its own `baseURL` is a route pi-ai reaches directly
 * — a gateway, a self-hosted server, another vendor's OpenAI-compatible API —
 * and one we can therefore list without knowing anything provider-specific.
 * Providers the catalog describes are skipped: their endpoint lives in pi-ai,
 * not in settings, so `TARGETS` is where those are named.
 */
export function extraTargets(section: unknown): CatalogTarget[] {
  const providers = (section as { providers?: Record<string, unknown> } | undefined)?.providers
  if (typeof providers !== 'object' || providers === null) return []
  const covered = new Set(TARGETS.filter(t => t.ns === 'llm-pi-ai').map(t => t.path[1]))
  return Object.entries(providers).flatMap(([id, raw]) => {
    if (covered.has(id)) return []
    const cfg = raw as { baseURL?: unknown; api?: unknown; apiKeyEnv?: unknown } | null
    if (typeof cfg !== 'object' || cfg === null || typeof cfg.baseURL !== 'string' || cfg.baseURL === '') return []
    // An unnamed protocol is pi-ai's own default, which is worth one attempt;
    // a named one that cannot be listed is not, or every Anthropic and OAuth
    // route would report a failure on each pass.
    if (cfg.api !== undefined && !LISTABLE_PROTOCOLS.has(String(cfg.api))) return []
    return [{
      label: id,
      ns: 'llm-pi-ai',
      path: ['providers', id, 'models'],
      defaultBaseURL: cfg.baseURL,
      defaultApiKeyEnv: typeof cfg.apiKeyEnv === 'string' ? cfg.apiKeyEnv : '',
      flavor: 'pi-ai' as const,
      floor: 1,
    }]
  })
}

/** Read a provider's own listing. `GET /models` is the shape every endpoint agrees on. */
export async function fetchListing(baseURL: string, apiKey: string | undefined, signal?: AbortSignal): Promise<unknown[]> {
  const r = await fetch(`${baseURL.replace(/\/+$/, '')}/models`, {
    signal: signal ?? AbortSignal.timeout(15_000),
    headers: { 'user-agent': 'dsh-flykit', ...apiKey === undefined ? {} : { authorization: `Bearer ${apiKey}` } },
  })
  if (!r.ok) throw new Error(`http ${r.status}`)
  const j = await r.json() as { data?: unknown }
  return Array.isArray(j.data) ? j.data : []
}

/** Shape raw listing records into discovered models, applying any withheld metadata. */
export function discover(raw: unknown[], target: CatalogTarget): DiscoveredModel[] {
  return raw.flatMap(record => {
    if (typeof record !== 'object' || record === null) return []
    const { id } = record as { id?: unknown }
    if (typeof id !== 'string' || id === '') return []
    const base = target.flavor === 'pi-ai' ? fromOpenRouter(record as OpenRouterModel) : { id }
    return [{ ...base, ...target.known?.[id] }]
  }).sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id))
}

/**
 * One discovered model as the target's section wants it.
 *
 * The two adapters name modalities differently and are not equally forgiving
 * about an absent field. pi-ai's `listModels` spreads `model.input` with no
 * guard, so a pi-ai entry must always carry `input` and a usable context
 * window. DeepSeek's `modelInfo` falls back to the id and to `['text']` on its
 * own, so a DeepSeek entry may be as thin as `{ id }` and inherit the
 * section's context window rather than have one invented here.
 */
export function entryFor(target: CatalogTarget, m: DiscoveredModel): Record<string, unknown> {
  if (target.flavor === 'pi-ai') {
    const contextWindow = Math.max(1, Math.floor(m.contextWindow ?? 32_768))
    return {
      id: m.id,
      name: m.name ?? m.id,
      contextWindow,
      maxTokens: Math.max(1, Math.min(contextWindow, Math.floor(m.maxTokens ?? DEFAULT_MAX_TOKENS))),
      input: m.input ?? ['text'],
    }
  }
  return {
    id: m.id,
    ...m.name === undefined ? {} : { name: m.name },
    ...m.contextWindow === undefined ? {} : { contextWindow: m.contextWindow },
    ...m.maxTokens === undefined ? {} : { maxTokens: m.maxTokens },
    ...m.input === undefined ? {} : { inputModalities: m.input },
  }
}

/**
 * DeepSeek's own platform API, ids only.
 *
 * Kept for callers that want the bare list — the sync path uses `fetchListing`
 * and `discover` so both providers share one code path.
 */
export async function fetchDeepSeekIds(apiKey: string, baseURL = 'https://api.deepseek.com', signal?: AbortSignal): Promise<string[]> {
  const raw = await fetchListing(baseURL, apiKey, signal)
  return raw.map(m => (m as { id?: unknown }).id).filter((id): id is string => typeof id === 'string' && id !== '').sort()
}
