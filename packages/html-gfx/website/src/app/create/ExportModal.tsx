'use client'
import { Modal } from './Modal'

export function ExportModal({
  open,
  onClose,
  html,
}: {
  open: boolean
  onClose: () => void
  html: string
}) {
  return (
    <Modal open={open} onClose={onClose} title="Export">
      <p className="text-sm text-gray-600">Export functionality coming soon.</p>
    </Modal>
  )
}
