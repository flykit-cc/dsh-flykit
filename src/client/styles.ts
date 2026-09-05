const STYLE_ID = 'dsh-flykit'

// The shipped ring fill is a hashed CSS-module class, so anchor on the two
// semantic attributes instead: the meter's ARIA role and the ring's rotation.
// `--flykit-ring` holds a var() reference to a --dsw-* token, never a literal.
const css = `button[aria-haspopup="dialog"] svg circle[transform^="rotate(-90"] { stroke: var(--flykit-ring, var(--dsw-alias-label-tertiary)); }`

export function installStyles(): () => void {
  if (document.querySelector(`style[data-plugin="${STYLE_ID}"]`) !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = STYLE_ID
  style.textContent = css
  document.head.append(style)
  return () => { style.remove() }
}
