'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import { buildGraphicHtml, graphicSpecSchema } from '@/lib/graphicSpec'
import { zodFieldErrors } from '@/lib/formErrors'
import { renderGraphic } from '@/lib/renderClient'

export type CreateGraphicActionState = {
  errors: FieldErrors
  message?: string
}

const GENERIC_FAILURE_MESSAGE =
  'Could not generate your graphic right now. Please try again.'

export async function createGraphicAction(
  _prevState: CreateGraphicActionState,
  formData: FormData,
): Promise<CreateGraphicActionState> {
  const raw = Object.fromEntries(formData)

  const parsed = graphicSpecSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: zodFieldErrors(parsed.error) }
  }

  const html = buildGraphicHtml(parsed.data)

  let renderedPath: string
  try {
    const result = await renderGraphic(html)
    renderedPath = result.path
  } catch (err) {
    console.error('Failed to render graphic:', err)
    return { errors: {}, message: GENERIC_FAILURE_MESSAGE }
  }

  const filename = renderedPath.split('/').pop()
  if (!filename) {
    return { errors: {}, message: GENERIC_FAILURE_MESSAGE }
  }

  redirect(`/api/download/${filename}`)
}
