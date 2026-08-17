import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { orderDocument } from './internal/orderDocument'

type CreateDocument = {
  colorScheme: 'light' | 'dark'
  title: string
  body: string
}

export function handleOrderDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CreateDocument) {
    const logger = env.logger.child({ handler: 'handleOrderDocument' })
    const localEnv = { ...env, logger }
    const document = await orderDocument(localEnv)(input)
    return document
  }
}
