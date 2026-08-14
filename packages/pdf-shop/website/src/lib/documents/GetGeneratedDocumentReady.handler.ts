import { getGeneratedDocument } from './DocumentGenerated.server'
import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'
import { getPaymentCompleted } from './PaymentCompleted.server'

export async function getGeneratedDocumentReadyHandler(input: object) {
  const { documentId } = getGeneratedDocumentSchema.parse(input)
  await getGeneratedDocument({ documentId })
  await getPaymentCompleted({ documentId })
  return true
}
