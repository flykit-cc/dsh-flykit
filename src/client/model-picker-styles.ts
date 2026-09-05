// Model picker chrome. Trigger matches the shell's 28px composer chips; the
// popover opens upward from the composer row. Tokens only.
export const MODEL_PICKER_CSS = `
.fkm-root { position: relative; min-width: 0; }
.fkm-trigger {
  display: flex; align-items: center; gap: 4px; min-width: 0; max-width: min(360px, 45cqw); height: 28px; padding: 0 4px 0 8px;
  border: none; border-radius: 24px; background: transparent; color: var(--dsw-alias-label-secondary);
  font-size: 13px; line-height: 20px; font-weight: 500; cursor: pointer; outline: none;
}
.fkm-trigger:hover:not(:disabled), .fkm-trigger[aria-expanded="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.fkm-trigger:focus-visible { box-shadow: 0 0 0 2px var(--dsw-alias-border-l3); }
.fkm-trigger:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.fkm-trigger-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fkm-trigger-effort, .fkm-trigger svg { flex: none; color: var(--dsw-alias-label-caption); }

.fkm-pop {
  position: absolute; bottom: calc(100% + 8px); right: 0; z-index: 30;
  width: min(560px, calc(100vw - 32px)); max-height: min(70vh, 620px);
  display: flex; flex-direction: column;
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary);
  border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
  font-size: 13px; line-height: 20px;
}
.fkm-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px 8px; color: var(--dsw-alias-label-tertiary); }
.fkm-search input {
  flex: 1; min-width: 0; height: 32px; padding: 0 10px; border-radius: 9px;
  border: 0.5px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; outline: none;
}
.fkm-search input:focus { border-color: var(--dsw-alias-brand-primary); }
.fkm-search input::placeholder { color: var(--dsw-alias-label-dimmed); }
.fkm-clear { all: unset; cursor: pointer; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 999px; color: var(--dsw-alias-label-tertiary); font-size: 16px; }
.fkm-clear:hover { background: var(--dsw-alias-interactive-bg-hover); }
.fkm-sync { all: unset; cursor: pointer; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; color: var(--dsw-alias-label-tertiary); }
.fkm-sync:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.fkm-sync[data-busy] svg { animation: fkm-spin 0.9s linear infinite; }
@keyframes fkm-spin { to { transform: rotate(360deg); } }

.fkm-pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; border-bottom: 0.5px solid var(--dsw-alias-border-l1); }
.fkm-pill {
  all: unset; display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 999px; cursor: pointer;
  font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-secondary); border: 0.5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base);
}
.fkm-pill span { font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.fkm-pill:hover { background: var(--dsw-alias-interactive-bg-hover); }
.fkm-pill[data-on] { color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-button-primary-fill); border-color: transparent; }
.fkm-pill[data-on] span { color: inherit; opacity: 0.75; }

.fkm-list { flex: 1; min-height: 120px; overflow: auto; padding: 6px; }
.fkm-group {
  position: sticky; top: -6px; z-index: 1; display: flex; justify-content: space-between; align-items: center;
  margin: 4px 0 2px; padding: 4px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-bg-layer-1);
}
.fkm-group span { font-weight: 400; text-transform: none; letter-spacing: 0; }
.fkm-row {
  display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px 0 6px; border-radius: 8px; cursor: pointer; min-width: 0;
}
.fkm-row[data-cursor="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.fkm-row[aria-selected="true"] .fkm-name { color: var(--dsw-alias-brand-primary); }
.fkm-check { width: 14px; flex: none; text-align: center; color: var(--dsw-alias-brand-primary); font-size: 12px; }
.fkm-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.fkm-badge { flex: none; font-size: 10px; line-height: 16px; padding: 0 6px; border-radius: 999px; color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-state-success-tertiary); }
.fkm-provider { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.fkm-id { margin-left: auto; flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.fkm-star { all: unset; flex: none; width: 20px; text-align: center; cursor: pointer; color: var(--dsw-alias-label-dimmed); opacity: 0; font-size: 13px; }
.fkm-row:hover .fkm-star, .fkm-row[data-cursor="true"] .fkm-star, .fkm-star[data-on] { opacity: 1; }
.fkm-star[data-on] { color: var(--dsw-alias-state-warn-primary); }

.fkm-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; border-top: 0.5px solid var(--dsw-alias-border-l1); }
.fkm-foot-label { font-size: 12px; color: var(--dsw-alias-label-tertiary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fkm-efforts { display: flex; gap: 4px; flex: none; }
.fkm-efforts button {
  all: unset; cursor: pointer; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 500;
  color: var(--dsw-alias-label-secondary); border: 0.5px solid var(--dsw-alias-border-l2);
}
.fkm-efforts button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.fkm-efforts button[data-on] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary) inset; }

.fkm-empty { padding: 24px 12px; text-align: center; color: var(--dsw-alias-label-tertiary); }
.fkm-loading { animation: fkm-pulse 1.2s ease-in-out infinite; }
@keyframes fkm-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.fkm-error { display: flex; gap: 10px; align-items: center; padding: 10px 12px; color: var(--dsw-alias-state-error-primary); }
.fkm-error button { all: unset; cursor: pointer; padding: 2px 10px; border-radius: 999px; color: var(--dsw-alias-label-primary); border: 0.5px solid var(--dsw-alias-border-l3); }
.fkm-fail { padding: 6px 12px; border-top: 0.5px solid var(--dsw-alias-border-l1); font-size: 11px; color: var(--dsw-alias-state-warn-label); display: flex; flex-wrap: wrap; gap: 10px; }
`
