/** Inject one stylesheet once per id; returns the remover. The shell serves no plugin CSS files. */
export function installStyle(id: string, css: string): () => void {
  if (document.querySelector(`style[data-plugin="${id}"]`) !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = id
  style.textContent = css
  document.head.append(style)
  return () => { style.remove() }
}
