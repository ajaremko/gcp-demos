import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getGeneratedDocumentStream } from './internal/getGeneratedDocumentStream'
import { getPaymentCompleted } from './internal/getPayment'

export function handleGetGeneratedDocument(env: { dataRoot: string }) {
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)
    const document = await getGeneratedDocument(env)({ documentId })
    await getPaymentCompleted(env)({ documentId })
    const { stream, size } = await getGeneratedDocumentStream({
      path: document.path,
    })
    return {
      stream,
      size,
      filename: document.filename,
      contentType: document.contentType,
    }
  }
}
