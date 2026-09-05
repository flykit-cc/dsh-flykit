import { useMemo, useState } from 'react'
import { ChevronIcon, FileIcon, FolderIcon } from './icons.tsx'

interface Dir { dirs: Map<string, Dir>; files: string[] }

function build(paths: string[]): Dir {
  const root: Dir = { dirs: new Map(), files: [] }
  for (const p of paths) {
    const parts = p.split('/')
    let d = root
    for (const part of parts.slice(0, -1)) {
      let next = d.dirs.get(part)
      if (next === undefined) { next = { dirs: new Map(), files: [] }; d.dirs.set(part, next) }
      d = next
    }
    d.files.push(parts[parts.length - 1]!)
  }
  return root
}

export interface FileTreeProps {
  files: string[]
  filter: string
  selected: string | null
  onSelect: (path: string) => void
}

export function FileTree({ files, filter, selected, onSelect }: FileTreeProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const q = filter.trim().toLowerCase()
  const tree = useMemo(() => build(files), [files])

  // A filter flattens the tree into matching paths: no folders to open while searching.
  if (q !== '') {
    const hits = files.filter(f => f.toLowerCase().includes(q)).slice(0, 300)
    return (
      <ul className="flykit-tree" role="tree">
        {hits.map(f => <Row key={f} depth={0} path={f} label={f} selected={selected === f} onClick={() => onSelect(f)} />)}
        {hits.length === 0 && <li className="flykit-empty">No match</li>}
      </ul>
    )
  }

  const toggle = (dir: string) => setOpen(s => { const n = new Set(s); n.has(dir) ? n.delete(dir) : n.add(dir); return n })

  const render = (d: Dir, prefix: string, depth: number): JSX.Element[] => {
    const out: JSX.Element[] = []
    for (const [name, sub] of [...d.dirs].sort(([a], [b]) => a.localeCompare(b))) {
      const path = prefix === '' ? name : `${prefix}/${name}`
      const isOpen = open.has(path)
      out.push(<Row key={path} depth={depth} path={path} label={name} dir dirOpen={isOpen} onClick={() => toggle(path)} />)
      if (isOpen) out.push(...render(sub, path, depth + 1))
    }
    for (const name of [...d.files].sort((a, b) => a.localeCompare(b))) {
      const path = prefix === '' ? name : `${prefix}/${name}`
      out.push(<Row key={path} depth={depth} path={path} label={name} selected={selected === path} onClick={() => onSelect(path)} />)
    }
    return out
  }

  return <ul className="flykit-tree" role="tree">{render(tree, '', 0)}{files.length === 0 && <li className="flykit-empty">No files</li>}</ul>
}

function Row({ depth, path, label, dir = false, dirOpen = false, selected = false, onClick }: {
  depth: number; path: string; label: string; dir?: boolean; dirOpen?: boolean; selected?: boolean; onClick: () => void
}) {
  return (
    <li role="treeitem" aria-expanded={dir ? dirOpen : undefined} aria-selected={selected}>
      <button type="button" title={path} style={{ paddingLeft: 8 + depth * 14 }} aria-current={selected || undefined} onClick={onClick}>
        <span className="flykit-tree-chev">{dir && <ChevronIcon open={dirOpen} />}</span>
        {dir ? <FolderIcon open={dirOpen} /> : <FileIcon name={label} />}
        <span className="flykit-tree-label">{label}</span>
      </button>
    </li>
  )
}
