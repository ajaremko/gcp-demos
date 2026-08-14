'use server'
import { ZodError, z } from 'zod'
import { redirect } from 'next/navigation'
import { type FieldErrors } from 'react-hook-form'

import { FileIOFailed, StripeIntegrationFailed } from './errors'
import { completePaymentHandler } from './CompletePayment.handler'
import { createDocumentHandler } from './CreateDocument.handler'

export type SpecActionState = {
  errors: FieldErrors
  message?: string
}

export async function submitDocumentSpecAction(
  _prevState: SpecActionState,
  formData: FormData,
): Promise<SpecActionState> {
  const raw = Object.fromEntries(formData)
  try {
    const result = await createDocumentHandler(raw)
    redirect(`/payment?documentId=${result.id}`)
  } catch (err) {
    // Log the error for visibility
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
}

export type ConfirmPaymentState = {
  errors: FieldErrors
  message?: string
}

export async function confirmPaymentAction(
  _prevState: ConfirmPaymentState,
  raw: { documentId: string; paymentIntentId: string },
): Promise<ConfirmPaymentState> {
  try {
    const result = await completePaymentHandler(raw)
    redirect(`/download?documentId=${result.documentId}`)
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
}
