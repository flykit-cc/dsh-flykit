import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export interface GitStatus {
  branch: string | null
  dirty: number
}

/**
 * `git status --porcelain=v2 --branch` in one read: `# branch.head <name>` is the
 * branch, and every non-`#` line is one changed or untracked path.
 */
export function parsePorcelain(stdout: string): GitStatus {
  const lines = stdout.split('\n').filter(l => l !== '')
  const head = lines.find(l => l.startsWith('# branch.head '))?.slice(14)
  return {
    branch: head === undefined || head === '(detached)' ? null : head,
    dirty: lines.filter(l => !l.startsWith('#')).length,
  }
}

export async function gitStatus(cwd: string): Promise<GitStatus> {
  const { stdout } = await run('git', ['status', '--porcelain=v2', '--branch'], {
    cwd, timeout: 3_000, maxBuffer: 4 << 20,
  })
  return parsePorcelain(stdout)
}
