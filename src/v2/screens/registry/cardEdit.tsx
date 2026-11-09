'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/src/ds/components/Button'
import { Modal } from '@/src/ds/components/Modal'
import { SectionCard } from './ui'

// Card-based editing for the batch editor (NOTI-6052, Manager Tool pattern):
// every card is read-only until its own Edit button is pressed; while editing,
// the card swaps Edit for Discard / Save. One card edits at a time — the editor
// (BatchEditorV2) owns the draft and asks before throwing changes away.

export interface CardEditApi {
  /** Card currently in edit mode, or null. */
  editing: string | null
  /** The open card has changes that are not saved yet. */
  dirty: boolean
  /** Open a card for editing (asks first if another card has unsaved changes). */
  start: (cardId: string) => void
  save: () => void
  discard: () => void
}

const Ctx = createContext<CardEditApi | null>(null)

export const CardEditProvider = Ctx.Provider

export function useCardEdit(): CardEditApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useCardEdit must be used inside CardEditProvider')
  return api
}

/** True while this card is the one being edited. */
export function useEditing(cardId: string): boolean {
  return useCardEdit().editing === cardId
}

export function EditableCard({
  cardId,
  title,
  id,
  canEdit = true,
  extraAction,
  children,
}: {
  cardId: string
  title: string
  id?: string
  /** False hides the Edit button (e.g. data that comes from the machine). */
  canEdit?: boolean
  /** Extra controls shown next to Edit / Save (e.g. Import). */
  extraAction?: ReactNode
  children: ReactNode
}) {
  const { editing, start, save, discard } = useCardEdit()
  const on = editing === cardId

  const action = on ? (
    <>
      <Button size="sm" variant="secondary" onClick={discard}>Discard</Button>
      <Button size="sm" variant="primary" onClick={save}>Save</Button>
    </>
  ) : canEdit ? (
    <Button size="sm" variant="secondary" leadingIcon={<Pencil className="size-4" />} onClick={() => start(cardId)} aria-label={`Edit ${title}`}>
      Edit
    </Button>
  ) : null

  return (
    <SectionCard
      title={title}
      id={id}
      editing={on}
      action={(action || extraAction) && (
        <div className="flex items-center gap-2">
          {extraAction}
          {action}
        </div>
      )}
    >
      {children}
    </SectionCard>
  )
}

export function UnsavedDialog({
  open,
  onSave,
  onDiscard,
  onClose,
}: {
  open: boolean
  onSave: () => void
  onDiscard: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Unsaved changes"
      footer={
        <>
          <Button variant="secondary" onClick={onDiscard}>Discard changes</Button>
          <Button variant="primary" onClick={onSave}>Save changes</Button>
        </>
      }
    >
      <p className="text-text-muted">
        You changed this card but did not save it. Do you want to save your changes before leaving?
      </p>
    </Modal>
  )
}
