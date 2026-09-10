'use client'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useFormContext } from 'react-hook-form'
import * as YAML from 'yaml'

import { graphicFormSchema, type GraphicFormValues } from '@/lib/graphicSpec'

import { Field } from './GraphicFieldsPanel'
import { Modal } from './Modal'

export function ImportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { reset } = useFormContext<GraphicFormValues>()
  const [error, setError] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setError(undefined)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(undefined)
    try {
      const text = await file.text()

      let parsed: unknown
      try {
        parsed = YAML.parse(text)
      } catch {
        setError('Could not parse that file as YAML.')
        return
      }

      const result = graphicFormSchema.safeParse(parsed)
      if (!result.success) {
        setError("That file doesn't match the expected format.")
        return
      }

      reset(result.data)
      onClose()
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import">
      <div className="flex flex-col gap-3">
        <Field label="YAML file" htmlFor="importFile">
          <input
            ref={fileInputRef}
            id="importFile"
            type="file"
            accept=".yml,.yaml"
            onChange={handleFileChange}
            className="w-full text-sm"
          />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}
