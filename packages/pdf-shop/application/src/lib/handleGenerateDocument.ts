import { type Logger } from 'pino'

import { getDocumentCreated } from './internal/getDocumentCreated'
import { generateDocument } from './internal/generateDocument'

type GenerateDocument = {
  documentId: string
}

export function handleGenerateDocument(env: {
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleGenerateDocument' })
  return async function (input: GenerateDocument) {
    const { documentId } = input
    const localEnv = { ...env, logger }

    const document = await getDocumentCreated(localEnv)({ documentId })
    return generateDocument(localEnv)({ documentId, spec: document.spec })
  }
}
