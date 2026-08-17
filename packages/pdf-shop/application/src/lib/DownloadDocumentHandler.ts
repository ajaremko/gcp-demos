import { type Logger } from 'pino'

import { readGenerationRecord } from './internal/readGenerationRecord'
import { readDocumentStream } from './internal/readDocumentStream'
import { readPaymentRecord } from './internal/readPaymentRecord'

export interface DownloadDocument {
  documentId: string
}

export function DownloadDocumentHandler(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'DownloadDocumentHandler' })
  return async function (input: DownloadDocument) {
    const { documentId } = input
    const localEnv = { ...env, logger }

    const document = await readGenerationRecord(localEnv)({ documentId })
    await readPaymentRecord(localEnv)({ documentId })
    const { stream, size } = await readDocumentStream(localEnv)({
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
