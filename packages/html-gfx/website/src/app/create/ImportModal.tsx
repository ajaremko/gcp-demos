'use client'
import { Modal } from './Modal'

export function ImportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Import">
      <p className="text-sm text-gray-600">Import functionality coming soon.</p>
    </Modal>
  )
}
