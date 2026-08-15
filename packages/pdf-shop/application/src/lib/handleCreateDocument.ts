import { type Stripe } from 'stripe'

import { createDocumentSpecSchema } from '@org/pdf-shop-contracts'

import { createDocument } from './internal/createDocument'

export function handleCreateDocument(env: {
  stripe: Stripe
  dataRoot: string
}) {
  return async function createDocumentHandler(input: object) {
    const parsed = createDocumentSpecSchema.parse(input)
    const spec = await createDocument(env)(parsed)
    return spec
  }
}
