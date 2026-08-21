'use server'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'
import { z } from 'zod'

import {
  isApplicationError,
  PurchaseDocumentHandler,
} from '@org/pdf-shop-application'

import { getStripeClient } from '@/lib/server/stripe'
import { pinoLogger } from '@/lib/server/pino'
import { resolveDataRoot } from '@/lib/server/dataRoot'
import { zodFieldErrors } from '@/lib/validation/formErrors'

/**
 * State shared by client and server to represent the
 * result (failure) of the purchaseDocumentAction.
 */
export type PurchaseDocumentActionState = {
  errors: FieldErrors
  message?: string
}

const purchaseDocumentSchema = z.object({
  documentId: z.uuid(),
  paymentIntentId: z.string(),
})

/**
 * Server action to finalize a document purchase. Confirms the payment with Stripe and
 * redirects the user to the download page.
 */
export async function purchaseDocumentAction(
  _prevState: PurchaseDocumentActionState,
  raw: { documentId: string; paymentIntentId: string },
): Promise<PurchaseDocumentActionState> {
  const parsed = purchaseDocumentSchema.safeParse(raw)
  if (!parsed.success) {
    pinoLogger.warn({ err: parsed.error }, 'Invalid purchase confirmation')
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
    pinoLogger.error(
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

  pinoLogger.info({ documentId }, 'Payment confirmed')
  redirect(`/download?doc=${documentId}`)
}
