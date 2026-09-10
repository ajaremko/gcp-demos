'use client'
import { useState } from 'react'

import { ImportModal } from './ImportModal'
import { ExportModal } from './ExportModal'

export function Navbar({ html }: { html: string }) {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
      <h1 className="text-lg font-semibold">Create a graphic</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium"
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Export
        </button>
      </div>
      <ImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <ExportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        html={html}
      />
    </div>
  )
}
