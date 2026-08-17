import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { createDocument } from './internal/createDocument'

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
    const spec = await createDocument(localEnv)(input)
    return spec
  }
}
