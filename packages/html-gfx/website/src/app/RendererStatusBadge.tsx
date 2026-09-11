'use client'
import { useRendererStatus } from '@/lib/query/useRendererStatus'
import { type RendererStatus } from '@/lib/renderClient'

const STATUS_DISPLAY: Record<RendererStatus, { dotColor: string; label: string }> = {
  ready: { dotColor: 'bg-green-500', label: 'Renderer ready' },
  starting: { dotColor: 'bg-yellow-500', label: 'Renderer starting…' },
  unavailable: { dotColor: 'bg-red-500', label: 'Renderer unavailable' },
}

export function RendererStatusBadge() {
  const { status, isLoading } = useRendererStatus()

  const { dotColor, label } = isLoading
    ? { dotColor: 'bg-gray-500', label: 'Checking renderer…' }
    : STATUS_DISPLAY[status]

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-300">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </div>
  )
}
