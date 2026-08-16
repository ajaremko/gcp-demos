import { type Logger } from 'pino'

import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getPaymentCompleted } from './internal/getPayment'

export function handleGetGeneratedDocumentReady(env: {
  dataRoot: string
  logger: Logger
}) {
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)
    const logger = env.logger.child({
      handler: 'handleGetGeneratedDocumentReady',
      documentId,
    })
    const localEnv = { ...env, logger }
    await getGeneratedDocument(localEnv)({ documentId })
    await getPaymentCompleted(localEnv)({ documentId })
    return true
  }
}
