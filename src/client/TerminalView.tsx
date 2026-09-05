import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { api } from './api.ts'

/** One xterm bound to one host PTY: output over SSE, input and size over small POSTs. */
export function TerminalView({ sessionId, id }: { sessionId: string; id: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current!
    const term = new Terminal({
      cursorBlink: true, fontSize: 13, lineHeight: 1.2, scrollback: 5000, allowProposedApi: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      theme: themeFromShell(),
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
    term.focus()

    return () => { es.close(); ro.disconnect(); input.dispose(); term.dispose() }
  }, [sessionId, id])

  return <div ref={host} className="flykit-term" />
}

/** Read the shell's tokens once per mount so the terminal follows light/dark. */
function themeFromShell() {
  const css = getComputedStyle(document.body)
  const v = (name: string) => css.getPropertyValue(name).trim() || undefined
  return {
    background: v('--dsw-alias-bg-base'),
    foreground: v('--dsw-alias-label-primary'),
    cursor: v('--dsw-alias-label-primary'),
    selectionBackground: v('--dsw-alias-interactive-bg-active'),
  }
}
