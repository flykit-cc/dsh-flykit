import { type Doc, tabLabels } from './docs.ts'
import { CloseIcon, FileIcon } from './icons.tsx'

function baseName(path: string): string { return path.slice(path.lastIndexOf('/') + 1) }

export interface EditorTabsProps {
  docs: Doc[]
  active: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

/** One tab per open file: a dot while unsaved, middle-click or × to close. */
export function EditorTabs({ docs, active, onSelect, onClose }: EditorTabsProps) {
  if (docs.length === 0) return null
  const label = tabLabels(docs.map(d => d.path))
  return (
    <div className="flykit-doctabs" role="tablist">
      {docs.map(d => (
        <div
          key={d.path}
          role="tab"
          aria-selected={d.path === active}
          className="flykit-doctab"
          title={d.path}
          // preventDefault on the middle button stops the browser's autoscroll cursor.
          onMouseDown={e => {
            if (e.button === 1) { e.preventDefault(); onClose(d.path) }
            else if (e.button === 0) onSelect(d.path)
          }}
        >
          <FileIcon name={baseName(d.path)} />
          <span className="flykit-doctab-name">{label.get(d.path)}</span>
          {d.text !== d.saved && <span className="flykit-doctab-dot" title="Unsaved changes" />}
          <button
            type="button"
            aria-label={`Close ${baseName(d.path)}`}
            onMouseDown={e => e.stopPropagation()}
            onClick={() => onClose(d.path)}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  )
}
