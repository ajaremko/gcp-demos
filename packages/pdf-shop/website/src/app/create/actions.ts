'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import {
  isApplicationError,
  OrderDocumentHandler,
} from '@org/pdf-shop-application'

import { stripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'
import { zodFieldErrors } from '@/lib/formErrors'

import { documentSpecSchema } from './documentSpecSchema'

const handler = OrderDocumentHandler({
  stripe: stripeClient,
  dataRoot: process.env.DATA_ROOT ?? '',
  logger: pinoLogger,
})

export type CreateDocumentActionState = {
  errors: FieldErrors
  message?: string
}

export async function createDocumentAction(
  _prevState: CreateDocumentActionState,
  formData: FormData,
): Promise<CreateDocumentActionState> {
  const raw = Object.fromEntries(formData)

  const parsed = documentSpecSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: zodFieldErrors(parsed.error) }
  }

  try {
    const result = await handler(parsed.data)
    redirect(`/payment?doc=${result.id}`)
  } catch (err) {
    // Handle filesystem and stripe integration errors
    if (isApplicationError(err)) {
      pinoLogger.warn({ err }, 'Failed to create document')
      return {
        errors: {},
        message:
          "We couldn't save your document at this time. Please try again later.",
      }
    }
    throw err
  }
}
