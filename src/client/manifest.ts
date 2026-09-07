// The shell ships its own manifest ("DeepSeek Harness", DeepSeek icon). This
// points the same <link> at flykit's, served by the host, so "Install page as
// app" puts the flykit glyph and the name "dsh" in the Dock. Chrome re-reads
// on href change, but only from a same-origin URL: a data: manifest is parsed
// yet never used for installing.
const OURS = '/api/flykit/manifest.webmanifest'

export function installManifest(): () => void {
  const shipped = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  const link = shipped ?? document.createElement('link')
  const before = link.getAttribute('href')
  link.rel = 'manifest'
  link.href = OURS
  if (shipped === null) document.head.append(link)
  // A hot reload may run this dispose after the next bundle's install; only
  // undo our own href, never the newer one.
  return () => {
    if (link.getAttribute('href') !== OURS) return
    if (before === null) link.remove(); else link.setAttribute('href', before)
  }
}
