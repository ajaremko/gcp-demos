'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'
import { z } from 'zod'

import {
  isApplicationError,
  PurchaseDocumentHandler,
} from '@org/pdf-shop-application'

import { getStripeClient } from '@/lib/stripe'
import { pinoLogger } from '@/lib/pino'
import { resolveDataRoot } from '@/lib/dataRoot'
import { zodFieldErrors } from '@/lib/formErrors'

export type PurchaseDocumentActionState = {
  errors: FieldErrors
  message?: string
}

const purchaseDocumentSchema = z.object({
  documentId: z.uuid(),
  paymentIntentId: z.string(),
})

export async function purchaseDocumentAction(
  _prevState: PurchaseDocumentActionState,
  raw: { documentId: string; paymentIntentId: string },
): Promise<PurchaseDocumentActionState> {
  const parsed = purchaseDocumentSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: zodFieldErrors(parsed.error) }
  }

  const handler = PurchaseDocumentHandler({
    stripe: getStripeClient(),
    dataRoot: resolveDataRoot(),
    logger: pinoLogger,
  })

  let documentId: string
  try {
    const result = await handler(parsed.data)
    documentId = result.documentId
  } catch (err) {
    pinoLogger.warn(
      { err, handler: 'purchaseDocumentAction' },
      'Failed to confirm payment',
    )
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

  redirect(`/download?doc=${documentId}`)
}
