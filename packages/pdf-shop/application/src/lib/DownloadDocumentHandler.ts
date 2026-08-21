import { type Logger } from 'pino'

import { readGenerationRecord } from './internal/readGenerationRecord'
import { readDocumentStream } from './internal/readDocumentStream'
import { readPaymentRecord } from './internal/readPaymentRecord'

export interface DownloadDocument {
  documentId: string
}

/**
 * Delivers a document's content to a customer - the final step in a
 * document's lifecycle, available only once both generation and payment
 * have completed.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger scoped to this handler is created once per instantiation.
 * @returns An async function that takes a {@link DownloadDocument}
 *   (`documentId`) and resolves to `{stream, size, filename, contentType}`,
 *   ready to pipe directly into an HTTP response.
 * @throws {GeneratedDocumentRecordNotFound} If the document has not been generated yet.
 * @throws {GeneratedDocumentRecordInvalid} If the generation record is invalid.
 * @throws {PaymentConfirmationNotFound} If the document has not been paid for.
 * @throws {PaymentConfirmationInvalid} If the payment confirmation record is invalid.
 * @throws {GeneratedDocumentNotFound} If the generated file itself is missing from disk.
 * @throws {GeneratedDocumentEmpty} If the generated file exists but is empty.
 *
 * @example
 * const { stream, size, filename, contentType } = await DownloadDocumentHandler({
 *   dataRoot,
 *   logger,
 * })({ documentId: '11111111-1111-4111-8111-111111111111' })
 * // stream.pipe(response)
 */
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
