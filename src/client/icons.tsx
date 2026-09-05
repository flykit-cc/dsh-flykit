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

/** Agent glyphs for the cards: a spark for Claude, pi, a prompt chevron for Codex, a prompt for shells. */
export function AgentGlyph({ agent }: { agent: string }) {
  switch (agent) {
    case 'claude': return <svg {...svg} aria-hidden style={{ color: '#d97757' }}><path d="M8 1.5l1.6 4.4L14 7.5l-4.4 1.6L8 13.5 6.4 9.1 2 7.5l4.4-1.6z" fill="currentColor" stroke="none" /></svg>
    case 'pi': return <svg {...svg} aria-hidden style={{ color: '#4fb3bf' }}><path d="M2.5 4.5h11 M5 4.5v8 M11 4.5v6.5a1.5 1.5 0 003 0" strokeWidth={1.8} /></svg>
    case 'codex': return <svg {...svg} aria-hidden style={{ color: '#10a37f' }}><path d="M3 4l4 4-4 4 M8.5 12h4.5" strokeWidth={1.8} /></svg>
    default: return <svg {...svg} aria-hidden style={{ color: 'var(--dsw-alias-label-secondary)' }}><rect x="1.5" y="2.5" width="13" height="11" rx="2" /><path d="M4.5 6l2 2-2 2 M8 10h3" /></svg>
  }
}
