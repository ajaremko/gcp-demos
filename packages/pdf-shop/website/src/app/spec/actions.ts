'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import {
  isApplicationError,
  handleCreateDocument,
} from '@org/pdf-shop-application'

import { stripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'
import { zodFieldErrors } from '@/lib/formErrors'

import { createDocumentSpecSchema } from './schema'

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

  const parsed = createDocumentSpecSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: zodFieldErrors(parsed.error) }
  }

  try {
    const result = await handler(parsed.data)
    redirect(`/payment?documentId=${result.id}`)
  } catch (err) {
    // Handle filesystem and stripe integration errors
    if (isApplicationError(err)) {
      console.warn({
        error: err,
        handler: 'submitDocumentSpecAction',
      })
      return {
        errors: {},
        message:
          "We couldn't save your document at this time. Please try again later.",
      }
    }
    throw err
  }
}
