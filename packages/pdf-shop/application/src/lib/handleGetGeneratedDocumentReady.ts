import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getPaymentCompleted } from './internal/getPayment'

export function handleGetGeneratedDocumentReady(env: { dataRoot: string }) {
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)
    await getGeneratedDocument(env)({ documentId })
    await getPaymentCompleted(env)({ documentId })
    return true
  }
}
