/**
 * Records the cockpit doing real work, for the README and flykit.cc.
 *
 *   node scripts/record-demo.mjs [--out docs/media] [--port 3080]
 *
 * Needs `dsh web` already running; the script reads its token URL out of
 * /tmp/dsh-web-<port>.log and never prints it. Produces cockpit.webm from
 * Playwright, then cockpit.mp4 and cockpit.gif via ffmpeg.
 *
 * The steps are scripted rather than hand-recorded so the clip is the same
 * every time: no mouse wobble, no half-typed command, and a re-record after a
 * UI change needs no second take.
 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? fallback : process.argv[i + 1]
}
const PORT = arg('port', '3080')
/** Which session to film; the first one in the sidebar unless named. */
const SESSION = arg('session', '')
/** Workspace holding it. A collapsed workspace keeps its sessions out of the DOM. */
const WORKSPACE = arg('workspace', '')
const OUT = arg('out', 'docs/media')
const WIDTH = 1280
const HEIGHT = 800

/** The dsh web URL including its session token, straight from the server's own log. */
async function tokenUrl() {
  const log = await readFile(`/tmp/dsh-web-${PORT}.log`, 'utf8').catch(() => '')
  const url = log.match(new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\S*token=\\S+`))?.[0]
  if (url === undefined) throw new Error(`no token URL in /tmp/dsh-web-${PORT}.log — is dsh web running?`)
  return url
}

const pause = (ms) => new Promise(r => setTimeout(r, ms))

/** Wait for a predicate that runs in the page, polling rather than racing a fixed sleep. */
async function until(page, label, fn, arg, timeout = 20_000) {
  process.stdout.write(`  ${label}… `)
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 250 })
    console.log('ok')
  } catch {
    const state = await page.evaluate(() => ({
      panel: document.querySelector('.flykit-panel') !== null,
      tab: [...document.querySelectorAll('.flykit-tabs button')].find(b => b.getAttribute('aria-selected') === 'true')?.textContent,
      filter: document.querySelector('.flykit-filter')?.value,
      tree: [...document.querySelectorAll('.flykit-tree-label')].slice(0, 6).map(e => e.textContent),
      session: [...document.querySelectorAll('[aria-label^="Session actions for"]')].map(b => b.getAttribute('aria-label')),
      title: document.title,
      docTabs: [...document.querySelectorAll('.flykit-doctab-name')].map(e => e.textContent),
    })).catch(() => null)
    throw new Error(`timed out waiting for: ${label}\n  state: ${JSON.stringify(state)}`)
  }
}

async function main() {
  const { chromium } = await import('playwright')
  const raw = join(OUT, '.raw')
  await rm(raw, { recursive: true, force: true })
  await mkdir(raw, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
    recordVideo: { dir: raw, size: { width: WIDTH, height: HEIGHT } },
  })
  const page = await context.newPage()
  const openedAt = Date.now()

  await page.goto(await tokenUrl(), { waitUntil: 'domcontentloaded' })
  await until(page, 'shell loaded', () => document.querySelectorAll('button').length > 3)
  await pause(1200)

  // The panel belongs to a session, so open one before anything else. A fresh
  // browser profile lands on the new-session screen, where there is no panel.
  if (WORKSPACE !== '') {
    await page.evaluate(name => {
      const row = [...document.querySelectorAll('[aria-label^="Workspace actions for"]')]
        .find(b => b.getAttribute('aria-label').toLowerCase().endsWith(name.toLowerCase()))
      // Click the label beside the actions button, which is what expands it.
      const label = [...(row?.closest('li,div')?.querySelectorAll('*') ?? [])]
        .find(e => e.children.length === 0 && e.textContent.trim().toLowerCase() === name.toLowerCase())
      ;(label ?? row)?.click()
    }, WORKSPACE)
    await pause(1_000)
  }
  await page.evaluate(name => {
    // Match the button's own aria-label, not an ancestor's text: the closest
    // block element contains the whole sidebar, so every row "matches".
    const buttons = [...document.querySelectorAll('[aria-label^="Session actions for"]')]
    const hit = name === ''
      ? buttons[0]
      : buttons.find(b => b.getAttribute('aria-label').toLowerCase().includes(name.toLowerCase())) ?? buttons[0]
    hit?.closest('li,a,div')?.click()
  }, SESSION)
  await until(page, 'session open', () =>
    [...document.querySelectorAll('button')].some(b => (b.getAttribute('aria-label') ?? b.title) === 'Open flykit panel'))
  await pause(900)

  // Collapse the sidebar: it lists every workspace, and those names are private.
  await page.evaluate(() => {
    document.querySelector('[aria-label="Collapse sidebar"]')?.click()
  })
  await pause(800)

  // 1. Open the panel.
  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')]
      .find(b => (b.getAttribute('aria-label') ?? b.title) === 'Open flykit panel')
      ?.click()
  })
  await until(page, 'panel open', () => document.querySelector('.flykit-panel') !== null)
  await pause(1400)

  // 2. Agents tab. Terminals outlive the browser, so a previous take leaves its
  // own running agents behind and the film would open on whatever they were.
  await page.evaluate(() => {
    ;[...document.querySelectorAll('.flykit-tabs button')].find(b => b.textContent === 'Agents')?.click()
  })
  await pause(700)
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.flykit-panel [aria-label="Close terminal"]')) b.click()
  })
  await until(page, 'no leftover terminals', () => document.querySelector('.flykit-term') === null)
  await pause(600)

  // Everything from here is the take; the setup above gets trimmed off.
  const startedAt = Date.now()

  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Shell')?.click()
  })
  await until(page, 'shell terminal', () => document.querySelector('.flykit-term .xterm-rows') !== null)
  await pause(1400)

  for (const line of ['git status -sb\r', 'ls src/client | head -6\r']) {
    await page.evaluate(text => {
      const el = document.querySelector('.flykit-term .xterm-helper-textarea')
      el?.focus()
      for (const ch of text) el?.dispatchEvent(new InputEvent('input', { data: ch, bubbles: true, inputType: 'insertText' }))
    }, line)
    await pause(2_400)
  }

  // 3. Explorer, with a file open.
  await page.evaluate(() => {
    ;[...document.querySelectorAll('.flykit-tabs button')].find(b => b.textContent === 'Explorer')?.click()
  })
  await until(page, 'file tree', () => document.querySelectorAll('.flykit-tree-label').length > 0)
  await pause(700)
  await page.evaluate(() => {
    const f = document.querySelector('.flykit-filter')
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(f, 'segments.ts')
    f.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await pause(900)
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.flykit-tree-label')]
    const pick = rows.find(e => e.textContent.endsWith('segments.ts'))
      ?? rows.find(e => /\.(ts|tsx)$/.test(e.textContent))
    pick?.click()
  })
  await until(page, 'editor open', () => document.querySelector('.cm-content') !== null)
  await page.evaluate(() => {
    const f = document.querySelector('.flykit-filter')
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(f, '')
    f.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await pause(2_000)

  // 4. Split: the shell above, the file below.
  await page.evaluate(() => document.querySelector('[aria-label="Split view"]')?.click())
  await pause(2_600)
  await page.evaluate(() => document.querySelector('[aria-label="Split view"]')?.click())
  await pause(800)

  // 5. The model picker over every configured provider.
  await page.evaluate(() => document.querySelector('.fkm-trigger')?.click())
  await until(page, 'model picker', () => document.querySelector('.fkm-pop') !== null)
  await pause(1200)
  for (const q of ['flash', 'deepseek v4']) {
    await page.evaluate(text => {
      const i = document.querySelector('.fkm-search input')
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      set.call(i, text)
      i.dispatchEvent(new Event('input', { bubbles: true }))
    }, q)
    await pause(1_800)
  }
  await page.keyboard.press('Escape')
  await pause(1_200)

  const leadIn = (startedAt - openedAt) / 1000
  await context.close()
  await browser.close()

  // Playwright names the file by page id; give it a stable name.
  const webm = (await readdir(raw)).find(f => f.endsWith('.webm'))
  if (webm === undefined) throw new Error('playwright wrote no video')
  const src = join(OUT, 'cockpit.webm')
  await rename(join(raw, webm), src)
  await rm(raw, { recursive: true, force: true })

  // An mp4 for the web (autoplay-friendly, a fraction of a GIF's weight) and a
  // GIF for places that will not play video, like a GitHub README.
  const mp4 = join(OUT, 'cockpit.mp4')
  // -ss drops the setup: opening a workspace shows every workspace name.
  const trim = ['-ss', leadIn.toFixed(2)]
  await run('ffmpeg', ['-y', ...trim, '-i', src, '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
    '-vf', `scale=${WIDTH}:-2`, '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-an', mp4])

  const palette = join(OUT, '.palette.png')
  const gif = join(OUT, 'cockpit.gif')
  const gifScale = 'fps=12,scale=900:-1:flags=lanczos'
  await run('ffmpeg', ['-y', ...trim, '-i', src, '-vf', `${gifScale},palettegen=stats_mode=diff`, palette])
  await run('ffmpeg', ['-y', ...trim, '-i', src, '-i', palette,
    '-lavfi', `${gifScale} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`, gif])
  await rm(palette, { force: true })

  console.log(`wrote ${mp4}, ${gif}, ${src}`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
