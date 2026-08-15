'use server'
import { ZodError, z } from 'zod'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import {
  FileIOFailed,
  StripeIntegrationFailed,
  handleCompletePayment,
} from '@org/pdf-shop-application'

import { stripeClient } from '@/lib/stripe'

const handler = handleCompletePayment({
  stripe: stripeClient,
  dataRoot: process.env.DATA_ROOT ?? '',
})

export type ConfirmPaymentState = {
  errors: FieldErrors
  message?: string
}

export async function confirmPaymentAction(
  _prevState: ConfirmPaymentState,
  raw: { documentId: string; paymentIntentId: string },
): Promise<ConfirmPaymentState> {
  let documentId: string
  try {
    const result = await handler(raw)
    documentId = result.documentId
  } catch (err) {
    console.warn({
      error: err,
      handler: 'confirmPaymentAction',
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
          "We couldn't complete your payment at this time. Please try again later.",
      }
    }
    // Handle any other unexpected errors
    return {
      errors: {},
      message:
        'Something went wrong while processing your request. Please try again later.',
    }
  }

  redirect(`/download?documentId=${documentId}`)
}
