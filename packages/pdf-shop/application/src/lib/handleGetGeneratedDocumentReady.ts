import { type Logger } from 'pino'

import { getGeneratedDocumentSchema } from '@org/pdf-shop-contracts'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getPaymentCompleted } from './internal/getPayment'

export function handleGetGeneratedDocumentReady(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({
    handler: 'handleGetGeneratedDocumentReady',
  })
  return async function (input: object) {
    const { documentId } = getGeneratedDocumentSchema.parse(input)

    logger.debug({ documentId }, 'Invoking getGeneratedDocument')
    await getGeneratedDocument({ ...env, logger })({ documentId })

    logger.debug({ documentId }, 'Invoking getPaymentCompleted')
    await getPaymentCompleted({ ...env, logger })({ documentId })

    return true
  }
}
