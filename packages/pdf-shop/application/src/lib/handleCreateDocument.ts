import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { createDocumentOrder } from './internal/createDocumentOrder'

type CreateDocument = {
  colorScheme: 'light' | 'dark'
  title: string
  body: string
}

export function handleCreateDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CreateDocument) {
    const logger = env.logger.child({ handler: 'handleCreateDocument' })
    const localEnv = { ...env, logger }
    const document = await createDocumentOrder(localEnv)(input)
    return document
  }
}
