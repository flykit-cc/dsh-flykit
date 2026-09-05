import type { CSSProperties } from 'react'

const svg = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// ponytail: the shell ships no syntax palette, so file kinds map onto its five semantic tokens.
const KIND: Record<string, string> = {
  ts: 'brand-primary', tsx: 'brand-primary', js: 'brand-primary', jsx: 'brand-primary', mjs: 'brand-primary', cjs: 'brand-primary',
  json: 'state-warn-primary', yml: 'state-warn-primary', yaml: 'state-warn-primary', toml: 'state-warn-primary',
  css: 'state-success-primary', html: 'state-success-primary', svg: 'state-success-primary',
  md: 'label-secondary', txt: 'label-secondary', py: 'state-business-primary', sh: 'state-business-primary',
}

export function FileIcon({ name }: { name: string }) {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  const style: CSSProperties = { color: `var(--dsw-alias-${KIND[ext] ?? 'label-tertiary'})` }
  return (
    <svg {...svg} style={style} aria-hidden>
      <path d="M4 1.5h5l3.5 3.5v9.5H4z" />
      <path d="M9 1.5V5h3.5" />
    </svg>
  )
}

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg {...svg} style={{ color: 'var(--dsw-alias-label-secondary)' }} aria-hidden>
      <path d={open ? 'M1.5 4.5h4l1.5 1.5h7.5v7.5h-13z M1.5 8h12' : 'M1.5 4.5h4l1.5 1.5h7.5v7.5h-13z'} />
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

export function EyeIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}
