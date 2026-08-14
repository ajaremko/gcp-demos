'use client'
import { useEffect, useState } from 'react'
import { HelperText, LinkButton } from '@/lib/shared/ui'

const POLL_INTERVAL_MS = 3000

export function DownloadStatusPoller({
  documentId,
  initialReady,
}: {
  documentId: string
  initialReady: boolean
}) {
  const [ready, setReady] = useState(initialReady)

  useEffect(() => {
    if (ready) return

    let cancelled = false
    const interval = setInterval(async () => {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = await response.json()
      if (!cancelled && data.ready) {
        setReady(true)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [ready, documentId])

  if (ready) {
    return (
      <LinkButton href={`/api/documents/${documentId}/download`}>
        Download PDF
      </LinkButton>
    )
  }

  return (
    <HelperText>
      Still processing your document — this page will update automatically once
      it&apos;s ready.
    </HelperText>
  )
}
