import { type Logger } from 'pino'

import { readOrderRecord } from './internal/readOrderRecord'
import { generateDocument } from './internal/generateDocument'

type GenerateDocument = { path: string }

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
