import { useContext, type ReactNode } from 'react'

import { EditContext, useEditing, type EditPart } from './edit-context'

function Pencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="doc-edit-icon">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The real <button> laid over a part of the paper: a faint outline shows what's editable, and
 * the part is reachable with Tab and named for screen readers ("Edit bill to").
 */
export function EditButton({ part, label }: { part: EditPart; label: string }) {
  const onEdit = useContext(EditContext)
  if (!onEdit) return null
  return (
    <button
      type="button"
      className="doc-edit-btn"
      aria-label={label}
      onClick={() => {
        onEdit(part)
      }}
    >
      <Pencil />
    </button>
  )
}

/** Wraps a block of the paper so it can be clicked to edit. Renders children as-is otherwise. */
export function Editable({
  part,
  label,
  children,
  className,
}: {
  part: EditPart
  label: string
  children: ReactNode
  className?: string
}) {
  const editing = useEditing()
  if (!editing) return <>{children}</>
  return (
    <div className={`doc-editable ${className ?? ''}`}>
      {children}
      <EditButton part={part} label={label} />
    </div>
  )
}

/** Hint text that only appears while editing (e.g. "+ Add notes"), never on the PDF. */
export function EditOnly({ children }: { children: ReactNode }) {
  return useEditing() ? <>{children}</> : null
}
