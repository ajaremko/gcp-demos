import { type Logger } from 'pino'

import { readGenerationRecord } from './internal/readGenerationRecord'
import { readPaymentRecord } from './internal/readPaymentRecord'

type GetGeneratedDocument = {
  documentId: string
}

export function CheckOrderStatusHandler(env: {
  dataRoot: string
  logger: Logger
}) {
  return async function (input: GetGeneratedDocument) {
    const { documentId } = input
    const logger = env.logger.child({
      handler: 'CheckOrderStatusHandler',
      documentId,
    })
    const localEnv = { ...env, logger }
    await readGenerationRecord(localEnv)({ documentId })
    await readPaymentRecord(localEnv)({ documentId })
    return true
  }
}
