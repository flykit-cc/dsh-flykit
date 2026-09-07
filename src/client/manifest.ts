// The shell ships its own manifest ("DeepSeek Harness", DeepSeek icon). This
// points the same <link> at a flykit one, so "Install page as app" puts the
// flykit glyph and the name "dsh" in the Dock. Chrome re-reads on href change.
// The token in the first URL only mints the auth cookie and redirects to a
// clean "/", and an installed Chrome app shares the profile's cookies, so the
// app starts at "/" and no token is ever baked into the manifest.
const GLYPH = '<path d="M2 20 L11 11 L11 13.5 L5 20 Z"/><path d="M7 20 L17 9 L17 11.5 L10.5 20 Z"/><path d="M12 20 L22 7 L22 9.5 L15 20 Z"/>'
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#fff"/><g fill="#000" transform="translate(12 12) scale(.72) translate(-12 -13.5)">${GLYPH}</g></svg>`

export function installManifest(): () => void {
  // Relative URLs in a manifest resolve against the manifest URL, which is a
  // data: URL here, so every URL is absolute.
  const root = `${location.origin}/`
  const manifest = {
    name: 'dsh', short_name: 'dsh', description: 'flykit cockpit',
    id: root, start_url: root, scope: root, display: 'standalone',
    background_color: '#000000', theme_color: '#000000',
    icons: [{ src: `data:image/svg+xml,${encodeURIComponent(ICON)}`, sizes: 'any', type: 'image/svg+xml' }],
  }
  const shipped = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  const link = shipped ?? document.createElement('link')
  const before = link.getAttribute('href')
  link.rel = 'manifest'
  link.href = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`
  if (shipped === null) document.head.append(link)
  return () => { if (before === null) link.remove(); else link.setAttribute('href', before) }
}
