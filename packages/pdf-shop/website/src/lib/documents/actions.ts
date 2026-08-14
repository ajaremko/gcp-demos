'use server'
import { redirect } from 'next/navigation'
import {
  type CreateDocumentSpec,
  createDocumentSpecSchema,
} from './DocumentCreated'
import { createDocumentSpec } from './DocumentCreated.server'
import { completePayment } from './PaymentCompleted.server'
import { completePaymentSchema } from './PaymentCompleted'

export type SpecActionState = {
  errors: Partial<
    Record<keyof CreateDocumentSpec, { type: string; message: string }>
  >
  values?: Record<string, unknown>
}

export async function submitDocumentSpecAction(
  _prevState: SpecActionState,
  formData: FormData,
): Promise<SpecActionState> {
  const raw = Object.fromEntries(formData)
  const parsed = createDocumentSpecSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const errors: SpecActionState['errors'] = {}
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) {
        errors[field as keyof CreateDocumentSpec] = {
          type: 'server',
          message: messages[0],
        }
      }
    }
    return { errors, values: raw }
  }

  const spec = await createDocumentSpec(parsed.data)
  redirect(`/payment?documentId=${spec.id}`)
}

export type ConfirmPaymentState = {
  error?: string
}

export async function confirmPaymentAction(
  _prevState: ConfirmPaymentState,
  raw: { documentId: string; paymentIntentId: string },
): Promise<ConfirmPaymentState> {
  const parsed = completePaymentSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: 'Invalid payment details' }
  }

  await completePayment(parsed.data)

  redirect(`/download?documentId=${raw.documentId}`)
}
