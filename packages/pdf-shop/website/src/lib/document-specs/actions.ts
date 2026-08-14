'use server'
import { redirect } from 'next/navigation'
import {
  type CreateDocumentSpec,
  createDocumentSpecSchema,
} from './DocumentSpecRecord'
import { createDocumentSpec } from './DocumentSpecRecord.server'

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
  redirect(`/payment?specId=${spec.id}`)
}
