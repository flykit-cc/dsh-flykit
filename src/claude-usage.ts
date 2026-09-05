import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { promisify } from 'node:util'

const run = promisify(execFile)
const CACHE_MS = 60_000

export interface UsageLimit { kind: string; label: string; percent: number; resetsAt: string | null; severity: string }
export interface ClaudeUsage { plan: string | null; limits: UsageLimit[] }

interface Oauth { accessToken: string; expiresAt?: number; subscriptionType?: string; rateLimitTier?: string }

/** Claude Code's login: macOS Keychain first, then the JSON file other platforms use. The token never leaves this process. */
async function oauth(): Promise<Oauth | null> {
  let raw: string | null = null
  if (process.platform === 'darwin') {
    try { raw = (await run('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { timeout: 3_000 })).stdout.trim() } catch {}
  }
  if (raw === null) {
    try { raw = await readFile(`${homedir()}/.claude/.credentials.json`, 'utf8') } catch { return null }
  }
  try { return (JSON.parse(raw) as { claudeAiOauth?: Oauth }).claudeAiOauth ?? null } catch { return null }
}

interface RawLimit { kind: string; percent: number; severity: string; resets_at: string | null; scope?: { model?: { display_name?: string } } | null }

function label(l: RawLimit): string {
  if (l.kind === 'session') return '5h'
  if (l.kind === 'weekly_all') return 'Week'
  return l.scope?.model?.display_name ?? l.kind
}

let cache: { at: number; value: ClaudeUsage | { error: string } } | null = null

export async function claudeUsage(): Promise<ClaudeUsage | { error: string }> {
  if (cache !== null && Date.now() - cache.at < CACHE_MS) return cache.value
  const value = await fetchUsage()
  cache = { at: Date.now(), value }
  return value
}

async function fetchUsage(): Promise<ClaudeUsage | { error: string }> {
  const o = await oauth()
  if (o === null) return { error: 'not-logged-in' }
  if (o.expiresAt !== undefined && o.expiresAt < Date.now()) return { error: 'expired' }
  const r = await fetch('https://api.anthropic.com/api/oauth/usage', {
    headers: { authorization: `Bearer ${o.accessToken}`, 'anthropic-beta': 'oauth-2025-04-20', 'user-agent': 'dsh-flykit' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!r.ok) return { error: `http-${r.status}` }
  const j = await r.json() as { limits?: RawLimit[] }
  return {
    plan: o.rateLimitTier?.replace(/^default_claude_/, '').replace('_', ' ') ?? o.subscriptionType ?? null,
    limits: (j.limits ?? []).map(l => ({ kind: l.kind, label: label(l), percent: l.percent, resetsAt: l.resets_at, severity: l.severity })),
  }
}
