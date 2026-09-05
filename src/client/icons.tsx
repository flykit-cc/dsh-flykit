import type { CSSProperties } from 'react'

const svg = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// Icons are content, not chrome: like VS Code's Seti set they carry their own
// small palette, picked to read on both the light and the dark shell theme.
const C = { blue: '#519aba', yellow: '#cbcb41', orange: '#e37933', green: '#8dc149', purple: '#a074c4', red: '#cc3e44', grey: '#8a8f98', pink: '#f55385', cyan: '#4fb3bf' }

type Glyph = { text: string; color: string } | { path: string; color: string; fill?: boolean }

// ponytail: one flat map; add rows as file kinds show up in real workspaces.
const BY_EXT: Record<string, Glyph> = {
  ts: { text: 'TS', color: C.blue }, mts: { text: 'TS', color: C.blue }, cts: { text: 'TS', color: C.blue },
  tsx: { text: 'TSX', color: C.cyan }, jsx: { text: 'JSX', color: C.cyan },
  js: { text: 'JS', color: C.yellow }, mjs: { text: 'JS', color: C.yellow }, cjs: { text: 'JS', color: C.yellow },
  json: { text: '{ }', color: C.yellow }, jsonc: { text: '{ }', color: C.yellow },
  yml: { path: 'M8 3v6.5 M8 12.5v.01', color: C.purple }, yaml: { path: 'M8 3v6.5 M8 12.5v.01', color: C.purple }, toml: { text: 'T', color: C.grey },
  md: { path: 'M8 2.5v10 M4 8.5l4 4 4-4', color: C.blue },
  markdown: { path: 'M8 2.5v10 M4 8.5l4 4 4-4', color: C.blue },
  html: { path: 'M5.5 4L2 8l3.5 4 M10.5 4L14 8l-3.5 4 M9 3L7 13', color: C.orange }, htm: { path: 'M5.5 4L2 8l3.5 4 M10.5 4L14 8l-3.5 4 M9 3L7 13', color: C.orange },
  css: { text: '#', color: C.blue }, scss: { text: '#', color: C.pink }, less: { text: '#', color: C.blue },
  py: { text: 'Py', color: C.blue }, rb: { text: 'Rb', color: C.red }, go: { text: 'Go', color: C.cyan }, rs: { text: 'Rs', color: C.orange },
  sh: { text: '$_', color: C.green }, zsh: { text: '$_', color: C.green }, bash: { text: '$_', color: C.green },
  sql: { text: 'SQL', color: C.orange }, env: { text: '=', color: C.yellow },
  svg: { path: 'M3 3h10v10H3z M5 10.5l2-3 1.5 2 1.5-1 2 2 M10 5.5h.01', color: C.purple },
  png: { path: 'M3 3h10v10H3z M5 10.5l2-3 1.5 2 1.5-1 2 2 M10 5.5h.01', color: C.purple },
  jpg: { path: 'M3 3h10v10H3z M5 10.5l2-3 1.5 2 1.5-1 2 2 M10 5.5h.01', color: C.purple },
  jpeg: { path: 'M3 3h10v10H3z M5 10.5l2-3 1.5 2 1.5-1 2 2 M10 5.5h.01', color: C.purple },
  gif: { path: 'M3 3h10v10H3z M5 10.5l2-3 1.5 2 1.5-1 2 2 M10 5.5h.01', color: C.purple },
  webp: { path: 'M3 3h10v10H3z M5 10.5l2-3 1.5 2 1.5-1 2 2 M10 5.5h.01', color: C.purple },
  lock: { path: 'M4 7.5h8v6H4z M5.5 7.5V5.5a2.5 2.5 0 015 0v2', color: C.grey },
  txt: { path: 'M4 1.5h5l3.5 3.5v9.5H4z M9 1.5V5h3.5 M6 8h4 M6 10.5h4', color: C.grey },
  log: { path: 'M4 1.5h5l3.5 3.5v9.5H4z M9 1.5V5h3.5 M6 8h4 M6 10.5h4', color: C.grey },
  pdf: { text: 'PDF', color: C.red }, csv: { text: 'CSV', color: C.green },
}

const BY_NAME: Record<string, Glyph> = {
  '.gitignore': { path: 'M5 3v10 M11 3v3a3 3 0 01-3 3H5 M5 3h.01 M11 3h.01 M5 13h.01', color: C.orange },
  '.gitattributes': { path: 'M5 3v10 M11 3v3a3 3 0 01-3 3H5 M5 3h.01 M11 3h.01 M5 13h.01', color: C.orange },
  '.gitmodules': { path: 'M5 3v10 M11 3v3a3 3 0 01-3 3H5 M5 3h.01 M11 3h.01 M5 13h.01', color: C.orange },
  'package.json': { path: 'M8 2l5 3v6l-5 3-5-3V5z M8 8l5-3 M8 8v6 M8 8L3 5', color: C.green },
  'package-lock.json': { path: 'M8 2l5 3v6l-5 3-5-3V5z M8 8l5-3 M8 8v6 M8 8L3 5', color: C.grey },
  'pnpm-lock.yaml': { path: 'M8 2l5 3v6l-5 3-5-3V5z M8 8l5-3 M8 8v6 M8 8L3 5', color: C.grey },
  'tsconfig.json': { text: 'TS', color: C.blue }, 'tsconfig.client.json': { text: 'TS', color: C.blue },
  'license': { path: 'M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5z', color: C.yellow },
  'readme.md': { path: 'M8 2a6 6 0 100 12A6 6 0 008 2z M8 7v4 M8 5h.01', color: C.blue },
  'dockerfile': { path: 'M2 9h11a2 2 0 010 4H4a2 2 0 01-2-2V9z M4 7h2v2H4z M7 7h2v2H7z M7 4.5h2v2H7z M10 7h2v2h-2z', color: C.blue },
  'makefile': { text: 'M', color: C.orange },
  '.editorconfig': { path: 'M3 4h10 M3 8h6 M3 12h8', color: C.grey },
  '.npmrc': { text: 'n', color: C.red }, '.nvmrc': { text: 'n', color: C.green },
}

const DEFAULT: Glyph = { path: 'M4 1.5h5l3.5 3.5v9.5H4z M9 1.5V5h3.5', color: C.grey }

function glyphFor(name: string): Glyph {
  const lower = name.toLowerCase()
  const byName = BY_NAME[lower]
  if (byName !== undefined) return byName
  if (lower.endsWith('.d.ts')) return { text: 'TS', color: C.grey }
  if (lower.endsWith('.test.ts') || lower.endsWith('.spec.ts') || lower.endsWith('.test.tsx')) return { path: 'M6 2h4 M7 2v4L3.5 12a1 1 0 00.9 1.5h7.2a1 1 0 00.9-1.5L9 6V2', color: C.green }
  if (lower.startsWith('.env')) return BY_EXT['env']!
  const ext = lower.slice(lower.lastIndexOf('.') + 1)
  return BY_EXT[ext] ?? DEFAULT
}

export function FileIcon({ name }: { name: string }) {
  const g = glyphFor(name)
  const style: CSSProperties = { color: g.color }
  if ('text' in g) {
    const size = g.text.length >= 3 ? 6.5 : g.text.length === 2 ? 8 : 10
    return (
      <svg {...svg} style={style} aria-hidden>
        <text x="8" y="8" textAnchor="middle" dominantBaseline="central" fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" fontSize={size}>{g.text}</text>
      </svg>
    )
  }
  return <svg {...svg} strokeWidth={1.6} style={style} aria-hidden><path d={g.path} /></svg>
}

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg {...svg} style={{ color: C.blue }} aria-hidden>
      {open
        ? <path d="M1.5 5.5V4a1 1 0 011-1h3l1.5 1.5h5.5a1 1 0 011 1V7 M1.5 5.5h11.6a1 1 0 01.95 1.3l-1.5 5a1 1 0 01-.95.7H2.5a1 1 0 01-1-1z" fill="currentColor" fillOpacity="0.18" />
        : <path d="M1.5 4a1 1 0 011-1h3l1.5 1.5h6a1 1 0 011 1V12a1 1 0 01-1 1h-10.5a1 1 0 01-1-1z" fill="currentColor" fillOpacity="0.18" />}
    </svg>
  )
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg {...svg} width={12} height={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', color: 'var(--dsw-alias-label-tertiary)' }} aria-hidden>
      <path d="M6 3l4 5-4 5" />
    </svg>
  )
}

/** Right-column toggle glyph: a frame with its right pane filled while open. */
export function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg {...svg} aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <path d="M10 2.5v11" />
      {open && <rect x="10" y="2.5" width="4.5" height="11" rx="1.5" fill="currentColor" stroke="none" />}
    </svg>
  )
}

export function CloseIcon() {
  return <svg {...svg} aria-hidden><path d="M4 4l8 8M12 4l-8 8" /></svg>
}

/** Four panes: every agent visible at once. */
export function GridIcon() {
  return (
    <svg {...svg} aria-hidden>
      <rect x="1.8" y="2.8" width="5.4" height="4.9" rx="1.2" />
      <rect x="8.8" y="2.8" width="5.4" height="4.9" rx="1.2" />
      <rect x="1.8" y="8.8" width="5.4" height="4.9" rx="1.2" />
      <rect x="8.8" y="8.8" width="5.4" height="4.9" rx="1.2" />
    </svg>
  )
}

/** Corner arrows: outward to fill the window, inward to give the chat its width back. */
export function MaxIcon({ on }: { on: boolean }) {
  return on
    ? <svg {...svg} aria-hidden><path d="M6.5 2.5V6.5H2.5 M9.5 13.5V9.5h4" /><path d="M6.5 6.5L2 2 M9.5 9.5L14 14" /></svg>
    : <svg {...svg} aria-hidden><path d="M10 2.5h3.5V6 M6 13.5H2.5V10" /><path d="M13.5 2.5L9.5 6.5 M2.5 13.5L6.5 9.5" /></svg>
}

/** Stacked-layout glyph: a frame cut in half, lower half filled while split. */
export function SplitIcon({ on }: { on: boolean }) {
  return (
    <svg {...svg} aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <path d="M1.5 8h13" />
      {on && <rect x="2.5" y="8.6" width="11" height="4.2" rx="1" fill="currentColor" stroke="none" />}
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

/**
 * Each vendor's own mark, used nominatively to name the agent in a tab.
 * Claude from simple-icons, OpenAI from @lobehub/icons-static-svg, Pi from
 * pi.dev/logo.svg. A shell has no vendor, so it keeps a drawn prompt.
 */
export function AgentGlyph({ agent }: { agent: string }) {
  const mark = { width: 16, height: 16, fill: 'currentColor', stroke: 'none' } as const
  switch (agent) {
    case 'claude': return <svg {...mark} viewBox="0 0 24 24" aria-hidden style={{ color: '#d97757' }}><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" /></svg>
    case 'pi': return <svg {...mark} viewBox="0 0 800 800" aria-hidden style={{ color: 'var(--dsw-alias-label-primary)' }}><path fillRule="evenodd" d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z" /><path d="M517.36 400H634.72V634.72H517.36Z" /></svg>
    case 'codex': return <svg {...mark} viewBox="0 0 24 24" aria-hidden style={{ color: 'var(--dsw-alias-label-primary)' }}><path fillRule="evenodd" d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" /></svg>
    default: return <svg {...svg} aria-hidden style={{ color: 'var(--dsw-alias-label-secondary)' }}><rect x="1.5" y="2.5" width="13" height="11" rx="2" /><path d="M4.5 6l2 2-2 2 M8 10h3" /></svg>
  }
}

