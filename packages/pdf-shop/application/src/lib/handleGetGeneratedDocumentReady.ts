import { type Logger } from 'pino'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getPaymentCompleted } from './internal/getPayment'

type GetGeneratedDocument = {
  documentId: string
}

export function handleGetGeneratedDocumentReady(env: {
  dataRoot: string
  logger: Logger
}) {
  return async function (input: GetGeneratedDocument) {
    const { documentId } = input
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
