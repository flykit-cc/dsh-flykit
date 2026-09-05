import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { yaml } from '@codemirror/lang-yaml'

function language(path: string): Extension {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': case 'jsx': return javascript({ jsx: true })
    case 'ts': case 'mts': case 'cts': return javascript({ typescript: true })
    case 'tsx': return javascript({ typescript: true, jsx: true })
    case 'json': return json()
    case 'py': return python()
    case 'md': case 'markdown': return markdown()
    case 'css': return css()
    case 'html': case 'htm': return html()
    case 'yml': case 'yaml': return yaml()
    default: return []
  }
}

// ponytail: the shell has no syntax tokens, so five --dsw-* roles stand in for a palette.
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operator], color: 'var(--dsw-alias-brand-primary)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--dsw-alias-state-success-primary)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--dsw-alias-state-warn-primary)' },
  { tag: [tags.comment, tags.meta], color: 'var(--dsw-alias-label-tertiary)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.typeName, tags.className, tags.tagName], color: 'var(--dsw-alias-label-primary)', fontWeight: '600' },
  { tag: [tags.propertyName, tags.attributeName, tags.heading], color: 'var(--dsw-alias-label-secondary)' },
])

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflow: 'auto' },
  '.cm-content': { caretColor: 'var(--dsw-alias-label-primary)' },
  '.cm-gutters': { backgroundColor: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-tertiary)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--dsw-alias-interactive-bg-hover)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'var(--dsw-alias-interactive-bg-active)' },
  '&.cm-focused': { outline: 'none' },
})

export interface EditorProps {
  path: string
  text: string
  onChange: (text: string) => void
  onSave: () => void
}

export function Editor({ path, text, onChange, onSave }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latest = useRef({ onChange, onSave })
  latest.current = { onChange, onSave }

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: text,
        extensions: [
          lineNumbers(), highlightActiveLine(), drawSelection(), history(), bracketMatching(),
          keymap.of([
            { key: 'Mod-s', run: () => { latest.current.onSave(); return true } },
            indentWithTab, ...defaultKeymap, ...historyKeymap,
          ]),
          language(path),
          syntaxHighlighting(highlight), theme,
          EditorView.updateListener.of(u => { if (u.docChanged) latest.current.onChange(u.state.doc.toString()) }),
        ],
      }),
    })
    view.current = v
    return () => { v.destroy(); view.current = null }
    // A new path is a new document: rebuild rather than diff.
  }, [path])

  // Text replaced from outside (reload, watch) while the same path stays open.
  useEffect(() => {
    const v = view.current
    if (v === null || v.state.doc.toString() === text) return
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } })
  }, [text])

  return <div ref={host} className="flykit-editor" />
}
