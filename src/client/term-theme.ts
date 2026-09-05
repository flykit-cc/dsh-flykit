import type { ITheme } from '@xterm/xterm'

// Terminal content palette, like the file icons: One Dark on a fixed dark card.
// Chrome around the card stays on --dsw-* tokens.
const DARK = {
  black: '#282c34', red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
  brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b', brightBlue: '#61afef', brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#ffffff',
}

export function isDark(): boolean { return document.body.hasAttribute('data-ds-dark-theme') }

/** Terminals stay dark on both shell themes: the window is a card, the text keeps its native look. */
export const TERM_BG = '#1b1e24'

export function terminalTheme(): ITheme {
  return {
    ...DARK,
    background: TERM_BG,
    foreground: '#c8ccd4',
    cursor: '#61afef',
    cursorAccent: TERM_BG,
    selectionBackground: 'rgba(97, 175, 239, 0.30)',
  }
}

/** Kept so the view can re-theme if the terminal ever follows the shell again. */
export function onThemeChange(cb: () => void): () => void {
  const mo = new MutationObserver(cb)
  mo.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
  return () => mo.disconnect()
}
