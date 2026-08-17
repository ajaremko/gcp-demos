import { type Logger } from 'pino'

import { getDocumentCreated } from './internal/getDocumentCreated'
import { generateDocument } from './internal/generateDocument'

type GenerateDocument = { path: string }

export function handleGenerateDocument(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleGenerateDocument' })
  return async function (input: GenerateDocument) {
    const localEnv = { ...env, logger }

    const document = await getDocumentCreated(localEnv)(input)
    return generateDocument(localEnv)({
      documentId: document.id,
      spec: document.spec,
    })
  }
}
