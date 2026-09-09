'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import { buildGraphicHtml, graphicSpecSchema } from '@/lib/graphicSpec'
import { zodFieldErrors } from '@/lib/formErrors'
import { renderGraphic } from '@/lib/renderClient'
import { pinoLogger } from '@/lib/server/pino'

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
    pinoLogger.warn({ err: parsed.error }, 'Invalid graphic spec')
    return { errors: zodFieldErrors(parsed.error) }
  }

  const html = buildGraphicHtml(parsed.data)

  let renderedPath: string
  try {
    const result = await renderGraphic(html)
    renderedPath = result.path
  } catch (err) {
    pinoLogger.error({ err }, 'Failed to render graphic')
    return { errors: {}, message: GENERIC_FAILURE_MESSAGE }
  }

  const filename = renderedPath.split('/').pop()
  if (!filename) {
    pinoLogger.warn(
      { renderedPath },
      'Renderer did not return a usable filename',
    )
    return { errors: {}, message: GENERIC_FAILURE_MESSAGE }
  }

  pinoLogger.info({ filename }, 'Graphic generated')
  redirect(`/api/download/${filename}`)
}
