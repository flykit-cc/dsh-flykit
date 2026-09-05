const STYLE_ID = 'dsh-flykit'

// Class names in the shell bundle are hashed, so every rule below anchors on
// semantic attributes or on flykit's own classes. Colours are --dsw-* tokens only.
const css = __XTERM_CSS__ + `
button[aria-haspopup="dialog"] svg circle[transform^="rotate(-90"] { stroke: var(--flykit-ring, var(--dsw-alias-label-tertiary)); }

/* The frame's grid is an inline style; an !important width beats it and the
   three shell columns share what is left. The panel itself sits in the gap. */
body[data-flykit-panel] div:has(> [data-shell-overlay]) {
  width: calc(100% - var(--flykit-panel-w, 0px)) !important;
  transition: width var(--ds-transition-duration) var(--ds-ease-in-out);
}
body[data-flykit-dragging] div:has(> [data-shell-overlay]) { transition: none; }
body[data-flykit-dragging] { cursor: col-resize; user-select: none; }

.flykit-toggle {
  display: inline-grid; place-items: center; width: 32px; height: 32px;
  border: 0.5px solid var(--dsw-alias-border-l4); border-radius: 18px;
  background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer;
}
.flykit-toggle:hover, .flykit-toggle[aria-pressed="true"] { background: var(--dsw-alias-interactive-bg-hover); }

.flykit-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: var(--flykit-panel-w);
  display: flex; flex-direction: column; min-width: 0;
  background: var(--dsw-alias-bg-base);
  border-left: 0.5px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family); font-size: 13px; line-height: 20px;
}
.flykit-panel-handle { position: absolute; top: 0; bottom: 0; left: -4px; width: 8px; cursor: col-resize; z-index: 2; touch-action: none; }
.flykit-panel-handle::after {
  content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 12px; height: 32px; border-radius: 10px; box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-2); border: 0.5px solid var(--dsw-alias-border-l3);
  opacity: 0; transition: opacity var(--ds-transition-duration) var(--ds-ease-in-out);
}
.flykit-panel:hover .flykit-panel-handle::after, body[data-flykit-dragging] .flykit-panel-handle::after { opacity: 1; }

.flykit-panel-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
.flykit-tabs { display: flex; gap: 16px; }
.flykit-tabs button {
  all: unset; cursor: pointer; padding: 4px 0 10px; font-size: 14px; line-height: 20px; font-weight: 500;
  color: var(--dsw-alias-label-secondary); border-bottom: 2px solid transparent; margin-bottom: -0.5px;
}
.flykit-tabs button[aria-selected="true"] { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
.flykit-close, .flykit-save {
  padding: 0; line-height: 0;
  display: grid; place-items: center; flex: none; width: 28px; height: 28px; margin-bottom: 6px;
  border: none; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer;
}
.flykit-close:hover { background: var(--dsw-alias-interactive-bg-hover); }

.flykit-panel-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.flykit-files-pane { flex: 0 0 auto; max-height: 38%; display: flex; flex-direction: column; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }
.flykit-filter {
  margin: 8px 12px; padding: 5px 10px; box-sizing: border-box; flex: none;
  border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; outline: none;
}
.flykit-filter:focus { border-color: var(--dsw-alias-brand-primary); }
.flykit-filter::placeholder { color: var(--dsw-alias-label-dimmed); }

.flykit-tree { list-style: none; margin: 0; padding: 0 4px 6px; overflow: auto; min-height: 0; }
.flykit-tree button {
  all: unset; display: flex; align-items: center; gap: 6px; box-sizing: border-box; width: 100%;
  height: 26px; padding-right: 8px; border-radius: 6px; cursor: pointer;
  color: var(--dsw-alias-label-primary); font-size: 13px; white-space: nowrap;
}
.flykit-tree button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.flykit-tree button[aria-current="true"] { background: var(--dsw-alias-interactive-bg-active); }
.flykit-tree svg { flex: none; }
.flykit-tree-chev { display: inline-grid; place-items: center; width: 12px; flex: none; }
.flykit-tree-label { overflow: hidden; text-overflow: ellipsis; }
.flykit-tree-dot { flex: none; width: 6px; height: 6px; margin-left: auto; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); }
.flykit-notice {
  display: flex; align-items: center; gap: 10px; padding: 6px 12px; font-size: 12px;
  color: var(--dsw-alias-state-warn-label); background: var(--dsw-alias-state-warn-tertiary);
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}
.flykit-notice button {
  all: unset; cursor: pointer; padding: 2px 10px; border-radius: 999px; font-weight: 500;
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
}
.flykit-notice button:hover { background: var(--dsw-alias-interactive-bg-hover); }

.flykit-terms { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.flykit-term-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }
.flykit-term-card {
  display: flex; align-items: center; gap: 7px; height: 30px; padding: 0 6px 0 10px; border-radius: 9px; cursor: pointer;
  font-size: 12.5px; font-weight: 500; color: var(--dsw-alias-label-secondary); white-space: nowrap;
  border: 0.5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1);
  transition: background var(--ds-transition-duration) var(--ds-ease-in-out), border-color var(--ds-transition-duration) var(--ds-ease-in-out);
}
.flykit-term-card:hover { background: var(--dsw-alias-interactive-bg-hover); }
.flykit-term-card[aria-selected="true"] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-base); box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary) inset; }
.flykit-term-card[data-dead] { opacity: 0.6; }
.flykit-term-card svg { flex: none; }
.flykit-term-state { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); box-shadow: 0 0 0 2px var(--dsw-alias-state-success-tertiary); }
.flykit-term-card[data-dead] .flykit-term-state { background: var(--dsw-alias-label-dimmed); box-shadow: none; }
.flykit-term-card button { all: unset; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 999px; cursor: pointer; color: var(--dsw-alias-label-tertiary); }
.flykit-term-card button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.flykit-usage { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 5px 12px; border-bottom: 0.5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.flykit-usage-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.flykit-usage-label { font-weight: 500; }
.flykit-usage-bar { width: 44px; height: 4px; border-radius: 2px; overflow: hidden; background: var(--dsw-alias-border-l2); }
.flykit-usage-bar > span { display: block; height: 100%; border-radius: 2px; background: var(--dsw-alias-brand-primary); transition: width var(--ds-transition-duration) var(--ds-ease-in-out); }
.flykit-usage-item[data-tone="warn"] .flykit-usage-bar > span { background: var(--dsw-alias-state-warn-primary); }
.flykit-usage-item[data-tone="error"] .flykit-usage-bar > span { background: var(--dsw-alias-state-error-primary); }
.flykit-usage-pct { min-width: 28px; text-align: right; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-secondary); }
.flykit-term-new { position: relative; margin-left: auto; }
.flykit-term-add {
  all: unset; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; font-size: 18px; line-height: 1;
  color: var(--dsw-alias-label-primary); border: 0.5px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-layer-1);
}
.flykit-term-add:hover, .flykit-term-add[aria-expanded="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.flykit-menu {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 5; min-width: 160px; margin: 0; padding: 4px; list-style: none;
  background: var(--dsw-alias-bg-layer-1); border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
}
.flykit-menu button { all: unset; display: flex; align-items: center; gap: 8px; box-sizing: border-box; width: 100%; padding: 7px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--dsw-alias-label-primary); }
.flykit-menu button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.flykit-term-hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--dsw-alias-label-tertiary); }
.flykit-term-hero p { margin: 0; }
.flykit-term-hero-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.flykit-term-hero-row button {
  all: unset; display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500;
  color: var(--dsw-alias-label-primary); border: 0.5px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-layer-1);
}
.flykit-term-hero-row button:hover { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l4); }
.flykit-term-body { flex: 1; min-height: 0; display: flex; }
.flykit-term { flex: 1; min-width: 0; min-height: 0; padding: 12px 4px 10px 14px; background: var(--dsw-alias-bg-base); }
.flykit-term .xterm { height: 100%; }
.flykit-term .xterm-viewport { background: transparent !important; }

.flykit-editor-pane { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.flykit-editor-bar { display: flex; align-items: center; gap: 8px; padding: 4px 8px 4px 12px; border-bottom: 0.5px solid var(--dsw-alias-border-l1); }
.flykit-editor-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.flykit-save { width: auto; height: 24px; margin: 0; padding: 0 10px; font-size: 12px; color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-button-primary-fill); }
.flykit-save:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.flykit-save:disabled { opacity: 0.35; cursor: default; }
.flykit-editor { flex: 1; min-height: 0; overflow: hidden; }
.flykit-editor .cm-editor { height: 100%; }
.flykit-empty { margin: 16px; color: var(--dsw-alias-label-tertiary); }
.flykit-loading { animation: flykit-pulse 1.2s ease-in-out infinite; }
@keyframes flykit-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.flykit-iconbtn {
  display: grid; place-items: center; flex: none; width: 24px; height: 24px; padding: 0; line-height: 0;
  border: none; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer;
}
.flykit-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.flykit-iconbtn[aria-pressed="true"] { color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-interactive-bg-active); }
.flykit-preview { flex: 1; min-height: 0; }
.flykit-preview-md { overflow: auto; padding: 12px 20px 24px; font-size: 14px; line-height: 1.6; }
.flykit-preview-frame { border: none; width: 100%; background: var(--dsw-alias-bg-base); }
`

export function installStyles(): () => void {
  if (document.querySelector(`style[data-plugin="${STYLE_ID}"]`) !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = STYLE_ID
  style.textContent = css
  document.head.append(style)
  return () => { style.remove() }
}