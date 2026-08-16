import { type Logger } from 'pino'

import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getGeneratedDocumentStream } from './internal/getGeneratedDocumentStream'
import { getPaymentCompleted } from './internal/getPayment'

export function handleGetGeneratedDocument(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleGetGeneratedDocument' })
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)
    const localEnv = { ...env, logger }

    const document = await getGeneratedDocument(localEnv)({ documentId })
    await getPaymentCompleted(localEnv)({ documentId })
    const { stream, size } = await getGeneratedDocumentStream(localEnv)({
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
