'use server'
import { ZodError, z } from 'zod'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import {
  FileIOFailed,
  StripeIntegrationFailed,
  handleCreateDocument,
} from '@org/pdf-shop-application'

import { stripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'

const handler = handleCreateDocument({
  stripe: stripeClient,
  dataRoot: process.env.DATA_ROOT ?? '',
  logger: pinoLogger,
})

export type SpecActionState = {
  errors: FieldErrors
  message?: string
}

export async function submitDocumentSpecAction(
  _prevState: SpecActionState,
  formData: FormData,
): Promise<SpecActionState> {
  const raw = Object.fromEntries(formData)

  let documentId: string
  try {
    const result = await handler(raw)
    documentId = result.id
  } catch (err) {
    console.warn({
      error: err,
      handler: 'submitDocumentSpecAction',
    })
    // Handle serverside validation errors
    if (err instanceof ZodError) {
      const fieldErrors = z.flattenError(err).fieldErrors
      return { errors: fieldErrors }
    }
    // Handle filesystem and stripe integration errors
    if (err instanceof FileIOFailed || err instanceof StripeIntegrationFailed) {
      return {
        errors: {},
        message:
          "We couldn't save your document at this time. Please try again later.",
      }
    }
    // Handle any other unexpected errors
    return {
      errors: {},
      message:
        'Something went wrong while processing your request. Please try again later.',
    }
  }

  redirect(`/payment?documentId=${documentId}`)
}
