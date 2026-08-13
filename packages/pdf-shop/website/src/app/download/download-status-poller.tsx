'use client'
import { useEffect, useState } from 'react'
import { HelperText, LinkButton } from '@/lib/ui'

const POLL_INTERVAL_MS = 3000

export function DownloadStatusPoller({
  specId,
  initialReady,
}: {
  specId: string
  initialReady: boolean
}) {
  const [ready, setReady] = useState(initialReady)

  useEffect(() => {
    if (ready) return

    let cancelled = false
    const interval = setInterval(async () => {
      const response = await fetch(`/api/documents/${specId}/status`, { cache: 'no-store' })
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
  }, [ready, specId])

  if (ready) {
    return <LinkButton href={`/api/documents/${specId}/download`}>Download PDF</LinkButton>
  }

  return (
    <HelperText>
      Still processing your document — this page will update automatically once it&apos;s ready.
    </HelperText>
  )
}
