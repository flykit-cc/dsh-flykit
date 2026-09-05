import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'

const LABELS = { code: { copyLabel: 'Copy', copiedLabel: 'Copied' }, footnotes: 'Footnotes' }

export function previewKind(path: string): 'markdown' | 'html' | null {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'html' || ext === 'htm' || ext === 'svg') return 'html'
  return null
}

/** Rendered view of a document: the shell's own Markdown renderer, or a script-free frame for HTML/SVG. */
export function Preview({ path, text }: { path: string; text: string }) {
  if (previewKind(path) === 'markdown') {
    return <div className="flykit-preview flykit-preview-md"><MarkdownText text={text} labels={LABELS} /></div>
  }
  // sandbox with no tokens: no scripts, no forms, no same-origin access to the shell.
  return <iframe className="flykit-preview flykit-preview-frame" title={path} sandbox="" srcDoc={text} />
}
