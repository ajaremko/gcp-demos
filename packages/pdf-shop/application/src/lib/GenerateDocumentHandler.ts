import { type Logger } from 'pino'

import { readOrderRecord } from './internal/readOrderRecord'
import { generateDocument } from './internal/generateDocument'

export interface GenerateDocument {
  path: string
}

/**
 * Produces a document's actual content once its order has been finalized -
 * the fulfillment step of the lifecycle, triggered by the order becoming
 * durable in storage rather than by a direct request.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger scoped to this handler is created once per instantiation.
 * @returns An async function that takes a {@link GenerateDocument} (`path`,
 *   the storage object path of the order record, e.g. `<documentId>/created.json`)
 *   and resolves to the written generation record.
 * @throws {DocumentOrderNotFound} If the order record at that path cannot be found.
 * @throws {DocumentOrderInvalid} If the order record is invalid.
 * @throws {GeneratedDocumentDirectoryFailed} If the document's output directory cannot be prepared.
 * @throws {GeneratedDocumentWriteFailed} If the generated content cannot be written to disk.
 * @throws {GenerationRecordWriteFailed} If the generation record cannot be written to disk.
 *
 * @example
 * const record = await GenerateDocumentHandler({ dataRoot, logger })({
 *   path: `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
 * })
 * // record.filename === '11111111-1111-4111-8111-111111111111.txt'
 */
export function GenerateDocumentHandler(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'GenerateDocumentHandler' })
  return async function (input: GenerateDocument) {
    const localEnv = { ...env, logger }

    const document = await readOrderRecord(localEnv)(input)
    return generateDocument(localEnv)({
      documentId: document.id,
      spec: document.spec,
    })
  }
}
