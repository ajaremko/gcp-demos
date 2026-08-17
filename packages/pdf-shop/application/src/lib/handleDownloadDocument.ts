import { type Logger } from 'pino'

import { getGeneratedDocument } from './internal/getGeneratedDocument'
import { getGeneratedDocumentStream } from './internal/getGeneratedDocumentStream'
import { getPaymentCompleted } from './internal/getPayment'

type GetGeneratedDocument = {
  documentId: string
}

export function handleDownloadDocument(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleDownloadDocument' })
  return async function (input: GetGeneratedDocument) {
    const { documentId } = input
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
