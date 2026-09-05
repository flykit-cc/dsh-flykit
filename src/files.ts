import { execFile } from 'node:child_process'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, sep, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const MAX_FILES = 5_000
const MAX_BYTES = 2 << 20   // 2 MiB: bigger files are refused, not truncated

/** Resolve `rel` inside `cwd`; null when it escapes (`..`, absolute, symlink games are not checked). */
export function safePath(cwd: string, rel: string): string | null {
  const root = resolve(cwd)
  const full = resolve(root, rel)
  return full === root || !full.startsWith(root + sep) ? null : full
}

/** Tracked + untracked-not-ignored files via git; plain walk when it is not a repo. */
export async function listFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd, timeout: 5_000, maxBuffer: 16 << 20,
    })
    return stdout.split('\0').filter(f => f !== '').sort().slice(0, MAX_FILES)
  } catch {
    return walk(cwd, '', [])
  }
}

// ponytail: depth-first readdir, no ignore rules; add an ignore list if a non-git workspace is ever huge.
async function walk(root: string, rel: string, out: string[]): Promise<string[]> {
  const entries = await readdir(join(root, rel), { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    if (out.length >= MAX_FILES) break
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const p = rel === '' ? e.name : `${rel}/${e.name}`
    if (e.isDirectory()) await walk(root, p, out)
    else if (e.isFile()) out.push(p)
  }
  return out
}

export async function readText(cwd: string, rel: string): Promise<string | null> {
  const full = safePath(cwd, rel)
  if (full === null) return null
  const buf = await readFile(full)
  if (buf.byteLength > MAX_BYTES) throw new Error('too large')
  return buf.toString('utf8')
}

export async function writeText(cwd: string, rel: string, text: string): Promise<boolean> {
  const full = safePath(cwd, rel)
  if (full === null) return false
  await writeFile(full, text, 'utf8')
  return true
}
