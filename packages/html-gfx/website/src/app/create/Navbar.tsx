'use client'
import { useState, useTransition } from 'react'
import { useFormContext } from 'react-hook-form'

import { type GraphicSpec } from '@/lib/graphicSpec'

import { createGraphicAction } from './actions'

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'graphic'
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function Navbar({ html }: { html: string }) {
  const { getValues, trigger } = useFormContext<GraphicSpec>()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>()

  function handleDownloadHtml() {
    const spec = getValues()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    downloadUrl(url, `${slugify(spec.headline)}.html`)
    URL.revokeObjectURL(url)
  }

  function handleDownloadPng() {
    setError(undefined)
    startTransition(async () => {
      const valid = await trigger()
      if (!valid) return

      const spec = getValues()
      const result = await createGraphicAction(spec)
      if (result.status === 'error') {
        setError(result.message ?? 'Could not generate your graphic.')
        return
      }
      downloadUrl(`/api/download/${result.filename}`, result.filename)
    })
  }

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
      <h1 className="text-lg font-semibold">Create a graphic</h1>
      <div className="flex items-center gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleDownloadHtml}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium"
        >
          Download HTML
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Generating…' : 'Download PNG'}
        </button>
      </div>
    </div>
  )
}
