const STYLE_ID = 'dsh-flykit'

// The shipped ring fill is a hashed CSS-module class, so anchor on the two
// semantic attributes instead: the meter's ARIA role and the ring's rotation.
// `--flykit-ring` holds a var() reference to a --dsw-* token, never a literal.
const css = `
button[aria-haspopup="dialog"] svg circle[transform^="rotate(-90"] { stroke: var(--flykit-ring, var(--dsw-alias-label-tertiary)); }

.flykit-drawer {
  pointer-events: auto;
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(48vw, 900px); min-width: 360px;
  display: flex; flex-direction: column;
  background: var(--dsw-alias-bg-layer-1);
  border-left: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 13px;
}
.flykit-drawer-head { display: flex; gap: 8px; align-items: center; padding: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.flykit-drawer-head > :first-child { flex: 1; min-width: 0; }
.flykit-drawer-body { flex: 1; display: grid; grid-template-columns: minmax(160px, 30%) 1fr; min-height: 0; }
.flykit-files { list-style: none; margin: 0; padding: 4px 0; overflow: auto; border-right: 1px solid var(--dsw-alias-border-l1); }
.flykit-files button {
  all: unset; display: block; box-sizing: border-box; width: 100%; padding: 3px 10px; cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
  color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.flykit-files button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.flykit-files button[aria-current="true"] { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.flykit-editor-host { min-width: 0; min-height: 0; display: flex; }
.flykit-editor { flex: 1; min-width: 0; overflow: hidden; }
.flykit-editor .cm-editor { height: 100%; }
.flykit-empty { margin: 16px; color: var(--dsw-alias-label-tertiary); }
.flykit-drawer-foot {
  padding: 4px 10px; border-top: 1px solid var(--dsw-alias-border-l1);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--dsw-alias-label-tertiary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
`

export function installStyles(): () => void {
  if (document.querySelector(`style[data-plugin="${STYLE_ID}"]`) !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = STYLE_ID
  style.textContent = css
  document.head.append(style)
  return () => { style.remove() }
}
