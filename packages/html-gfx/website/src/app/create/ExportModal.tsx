'use client'
import { useState, useTransition, type ChangeEvent } from 'react'
import { useFormContext } from 'react-hook-form'
import * as YAML from 'yaml'

import { type GraphicFormValues } from '@/lib/graphicSpec'
import { type ImageFormat } from '@/lib/renderClient'
import { useRendererReady } from '@/lib/query/useRendererReady'

import { createGraphicAction } from './actions'
import { Field } from './GraphicFieldsPanel'
import { Modal } from './Modal'

const EXPORT_FORMAT_IDS = ['yaml', 'html', 'png', 'jpeg', 'webp'] as const

type ExportFormatId = (typeof EXPORT_FORMAT_IDS)[number]

const EXPORT_FORMAT_LABELS: Record<ExportFormatId, string> = {
  yaml: 'YAML',
  html: 'HTML',
  png: 'PNG',
  jpeg: 'JPG',
  webp: 'WebP',
}

const IMAGE_FORMAT_IDS = new Set<ExportFormatId>(['png', 'jpeg', 'webp'])

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

export function ExportModal({
  open,
  onClose,
  html,
}: {
  open: boolean
  onClose: () => void
  html: string
}) {
  const { getValues, trigger } = useFormContext<GraphicFormValues>()
  const { ready: rendererReady } = useRendererReady()
  const [format, setFormat] = useState<ExportFormatId>('html')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>()

  function handleFormatChange(event: ChangeEvent<HTMLSelectElement>) {
    setFormat(event.target.value as ExportFormatId)
  }

  function handleExportHtml() {
    const spec = getValues()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    downloadUrl(url, `${slugify(spec.headline.text)}.html`)
    URL.revokeObjectURL(url)
    onClose()
  }

  function handleExportYaml() {
    const spec = getValues()
    const yamlText = YAML.stringify(spec)
    const blob = new Blob([yamlText], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    downloadUrl(url, `${slugify(spec.headline.text)}.yml`)
    URL.revokeObjectURL(url)
    onClose()
  }

  function handleExportImage(imageFormat: ImageFormat) {
    if (!rendererReady) return
    setError(undefined)
    startTransition(async () => {
      const valid = await trigger()
      if (!valid) return

      const spec = getValues()
      const result = await createGraphicAction(spec, imageFormat)
      if (result.status === 'error') {
        setError(result.message ?? 'Could not generate your graphic.')
        return
      }
      downloadUrl(`/api/download/${result.filename}`, result.filename)
      onClose()
    })
  }

  function handleExport() {
    if (format === 'html') {
      handleExportHtml()
    } else if (format === 'yaml') {
      handleExportYaml()
    } else {
      handleExportImage(format)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export">
      <div className="flex flex-col gap-3">
        <Field label="Format" htmlFor="exportFormat">
          <select
            id="exportFormat"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100"
            value={format}
            onChange={handleFormatChange}
          >
            {EXPORT_FORMAT_IDS.map((id) => (
              <option
                key={id}
                value={id}
                disabled={IMAGE_FORMAT_IDS.has(id) && !rendererReady}
              >
                {EXPORT_FORMAT_LABELS[id]}
              </option>
            ))}
          </select>
        </Field>

        {!rendererReady && (
          <p className="text-sm text-yellow-400">
            Image export is temporarily unavailable — the renderer isn&apos;t
            ready yet.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Generating…' : 'Export'}
        </button>
      </div>
    </Modal>
  )
}
