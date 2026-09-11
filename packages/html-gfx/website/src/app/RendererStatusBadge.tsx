'use client'
import { useRendererReady } from '@/lib/query/useRendererReady'

export function RendererStatusBadge() {
  const { ready, isLoading } = useRendererReady()

  const { dotColor, label } = isLoading
    ? { dotColor: 'bg-gray-500', label: 'Checking renderer…' }
    : ready
      ? { dotColor: 'bg-green-500', label: 'Renderer ready' }
      : { dotColor: 'bg-red-500', label: 'Renderer unavailable' }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-300">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </div>
  )
}
