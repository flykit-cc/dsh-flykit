const svg = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function BellIcon({ muted }: { muted: boolean }) {
  return (
    <svg {...svg} aria-hidden>
      <path d="M4 11V7a4 4 0 018 0v4l1 1.5H3z M6.5 13.5a1.5 1.5 0 003 0" />
      {muted && <path d="M2.5 2.5l11 11" />}
    </svg>
  )
}
