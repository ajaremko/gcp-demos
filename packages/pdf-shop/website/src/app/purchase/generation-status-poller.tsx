'use client'
import { useEffect, useState } from 'react'
import { HelperText } from '@/lib/ui'

const POLL_INTERVAL_MS = 3000

export function GenerationStatusPoller({
  documentId,
  initialGenerated,
}: {
  documentId: string
  initialGenerated: boolean
}) {
  const [generated, setGenerated] = useState(initialGenerated)

  useEffect(() => {
    if (generated) return

    let cancelled = false
    const interval = setInterval(async () => {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = await response.json()
      if (!cancelled && data.generated) {
        setGenerated(true)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [generated, documentId])

  return (
    <HelperText>
      {generated
        ? 'Your document has been generated and is ready.'
        : 'Your document is being generated in the background.'}
    </HelperText>
  )
}
