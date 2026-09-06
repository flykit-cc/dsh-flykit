import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { api } from './api.ts'
import { onThemeChange, terminalTheme } from './term-theme.ts'

/** One xterm bound to one host PTY: output over SSE, input and size over small POSTs. */
export function TerminalView({ sessionId, id, autoFocus = true }: { sessionId: string; id: string; autoFocus?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  // Several views are mounted at once in the grid; only the focused one may grab the keyboard.
  const grabFocus = useRef(autoFocus)

  useEffect(() => {
    const el = host.current!
    const term = new Terminal({
      cursorBlink: true, fontSize: 12.5, lineHeight: 1.35, scrollback: 5000, allowProposedApi: true,
      // Tools that emit truecolor bypass the palette; xterm darkens or lightens any text colour to at least this contrast.
      minimumContrastRatio: 4.5,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      theme: terminalTheme(),
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    // Keystrokes burst; one POST per animation frame keeps the loopback chatter low.
    let queue = ''
    let flushing = false
    const flush = () => {
      flushing = false
      if (queue === '') return
      const data = queue; queue = ''
      fetch(api('term/input', sessionId, { id }), { method: 'POST', body: data }).catch(() => {})
    }
    const input = term.onData(d => { queue += d; if (!flushing) { flushing = true; requestAnimationFrame(flush) } })

    let lastSize = ''
    const sendSize = () => {
      // A hidden pane measures 0: fitting there would resize the PTY to a stub and reflow its output.
      if (el.clientWidth === 0 || el.clientHeight === 0) return
      // xterm measures its cell size in its own IntersectionObserver, which can run after ours;
      // until then fit() sees a 0px cell and silently keeps the 80x24 default.
      if (fit.proposeDimensions() === undefined) { setTimeout(sendSize, 50); return }
      fit.fit()
      const size = `${term.cols}x${term.rows}`
      if (size === lastSize) return
      lastSize = size
      fetch(api('term/resize', sessionId, { id, cols: String(term.cols), rows: String(term.rows) }), { method: 'POST' }).catch(() => {})
    }
    const ro = new ResizeObserver(() => sendSize())
    ro.observe(el)
    sendSize()

    const es = new EventSource(api('term/stream', sessionId, { id }))
    let first = true
    es.onmessage = e => {
      const chunk = JSON.parse(e.data) as string
      if (first) { first = false; term.clear() }
      term.write(chunk)
    }
    if (grabFocus.current) term.focus()
    const stopTheme = onThemeChange(() => { term.options.theme = terminalTheme() })

    return () => { stopTheme(); es.close(); ro.disconnect(); input.dispose(); term.dispose() }
  }, [sessionId, id])

  return <div ref={host} className="flykit-term" />
}
