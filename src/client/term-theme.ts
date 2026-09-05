import type { ITheme } from '@xterm/xterm'

// Terminal content palette, like the file icons: One Light / One Dark, chosen to
// read on the shell's own background. Chrome around it stays on --dsw-* tokens.
const LIGHT = {
  black: '#383a42', red: '#ca1243', green: '#3f8f3e', yellow: '#986801', blue: '#2f6bd8', magenta: '#a626a4', cyan: '#0a7a9e', white: '#8b8f98',
  brightBlack: '#696c77', brightRed: '#ca1243', brightGreen: '#3f8f3e', brightYellow: '#986801', brightBlue: '#2f6bd8', brightMagenta: '#a626a4', brightCyan: '#0a7a9e', brightWhite: '#383a42',
}
const DARK = {
  black: '#282c34', red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
  brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b', brightBlue: '#61afef', brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#ffffff',
}

export function isDark(): boolean { return document.body.hasAttribute('data-ds-dark-theme') }

/** Shell tokens for the surfaces, a fixed ANSI palette for the text. */
export function terminalTheme(): ITheme {
  const css = getComputedStyle(document.body)
  const v = (name: string) => css.getPropertyValue(name).trim() || undefined
  return {
    ...(isDark() ? DARK : LIGHT),
    background: v('--dsw-alias-bg-base'),
    foreground: v('--dsw-alias-label-primary'),
    cursor: v('--dsw-alias-brand-primary'),
    cursorAccent: v('--dsw-alias-bg-base'),
    selectionBackground: isDark() ? 'rgba(97, 175, 239, 0.30)' : 'rgba(64, 120, 242, 0.20)',
  }
}

/** Re-theme when the shell flips light/dark; the shell toggles one body attribute. */
export function onThemeChange(cb: () => void): () => void {
  const mo = new MutationObserver(cb)
  mo.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'class', 'style'] })
  return () => mo.disconnect()
}
