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

    logger.debug({ documentId }, 'Invoking getGeneratedDocument')
    const document = await getGeneratedDocument({ ...env, logger })({
      documentId,
    })

    logger.debug({ documentId }, 'Invoking getPaymentCompleted')
    await getPaymentCompleted({ ...env, logger })({ documentId })

    logger.debug({ documentId, path: document.path }, 'Invoking getGeneratedDocumentStream')
    const { stream, size } = await getGeneratedDocumentStream({
      ...env,
      logger,
    })({
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
