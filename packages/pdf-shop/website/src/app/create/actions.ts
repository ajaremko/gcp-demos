'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import {
  isApplicationError,
  OrderDocumentHandler,
} from '@org/pdf-shop-application'

import { getStripeClient } from '@/lib/server/stripe'
import { pinoLogger } from '@/lib/server/pino'
import { resolveDataRoot } from '@/lib/server/dataRoot'
import { zodFieldErrors } from '@/lib/validation/formErrors'

import { documentSpecSchema } from './documentSpecSchema'

/**
 * State shared by client and server to represent the
 * result (failure) of the createDocumentAction.
 */
export type CreateDocumentActionState = {
  errors: FieldErrors
  message?: string
}

/**
 * Server action to order a new document. Creates the new order and
 * redirects the user to the purchase page.
 */
export async function createDocumentAction(
  _prevState: CreateDocumentActionState,
  formData: FormData,
): Promise<CreateDocumentActionState> {
  const raw = Object.fromEntries(formData)

  const parsed = documentSpecSchema.safeParse(raw)
  if (!parsed.success) {
    pinoLogger.warn({ err: parsed.error }, 'Invalid document spec')
    return { errors: zodFieldErrors(parsed.error) }
  }

  const handler = OrderDocumentHandler({
    stripe: getStripeClient(),
    dataRoot: resolveDataRoot(),
    logger: pinoLogger,
  })

  try {
    const result = await handler(parsed.data)
    pinoLogger.info({ documentId: result.id }, 'Document order created')
    redirect(`/purchase?doc=${result.id}`)
  } catch (err) {
    // Handle filesystem and stripe integration errors
    if (isApplicationError(err)) {
      pinoLogger.error({ err }, 'Failed to create document')
      return {
        errors: {},
        message:
          "We couldn't save your document at this time. Please try again later.",
      }
    }
    throw err
  }
}
