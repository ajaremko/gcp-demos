'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import {
  isApplicationError,
  handleCompletePayment,
} from '@org/pdf-shop-application'

import { stripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'
import { zodFieldErrors } from '@/lib/formErrors'

import { completePaymentSchema } from './schema'

const handler = handleCompletePayment({
  stripe: stripeClient,
  dataRoot: process.env.DATA_ROOT ?? '',
  logger: pinoLogger,
})

export type ConfirmPaymentState = {
  errors: FieldErrors
  message?: string
}

export async function confirmPaymentAction(
  _prevState: ConfirmPaymentState,
  raw: { documentId: string; paymentIntentId: string },
): Promise<ConfirmPaymentState> {
  const parsed = completePaymentSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: zodFieldErrors(parsed.error) }
  }

  let documentId: string
  try {
    const result = await handler(parsed.data)
    documentId = result.documentId
  } catch (err) {
    console.warn({
      error: err,
      handler: 'confirmPaymentAction',
    })
    // Handle filesystem and stripe integration errors
    if (isApplicationError(err)) {
      switch (err.tag) {
        case 'PaymentIntentNotFound':
          return {
            errors: {},
            message:
              "We couldn't verify your payment with Stripe. Please try again later.",
          }
        case 'PaymentIntentInvalid':
          return {
            errors: {},
            message: 'Your payment could not be confirmed. Please try again.',
          }
        case 'PaymentRecordWriteFailed':
          return {
            errors: {},
            message:
              "We couldn't save your payment confirmation. Please try again later.",
          }
        default:
          return {
            errors: {},
            message:
              "We couldn't complete your payment at this time. Please try again later.",
          }
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
