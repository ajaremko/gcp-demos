'use server'
import { type FieldErrors } from 'react-hook-form'

import {
  buildGraphicHtml,
  graphicSpecSchema,
  type GraphicSpec,
} from '@/lib/graphicSpec'
import { zodFieldErrors } from '@/lib/formErrors'
import { renderGraphic } from '@/lib/renderClient'
import { pinoLogger } from '@/lib/server/pino'

export type CreateGraphicActionState =
  | { status: 'success'; filename: string }
  | { status: 'error'; errors: FieldErrors; message?: string }

const GENERIC_FAILURE_MESSAGE =
  'Could not generate your graphic right now. Please try again.'

export async function createGraphicAction(
  spec: GraphicSpec,
): Promise<CreateGraphicActionState> {
  const parsed = graphicSpecSchema.safeParse(spec)
  if (!parsed.success) {
    pinoLogger.warn({ err: parsed.error }, 'Invalid graphic spec')
    return { status: 'error', errors: zodFieldErrors(parsed.error) }
  }

  const html = buildGraphicHtml(parsed.data)

  let renderedPath: string
  try {
    const result = await renderGraphic(html)
    renderedPath = result.path
  } catch (err) {
    pinoLogger.error({ err }, 'Failed to render graphic')
    return { status: 'error', errors: {}, message: GENERIC_FAILURE_MESSAGE }
  }

  const filename = renderedPath.split('/').pop()
  if (!filename) {
    pinoLogger.warn(
      { renderedPath },
      'Renderer did not return a usable filename',
    )
    return { status: 'error', errors: {}, message: GENERIC_FAILURE_MESSAGE }
  }

  pinoLogger.info({ filename }, 'Graphic generated')
  return { status: 'success', filename }
}
