import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { orderDocument } from './internal/orderDocument'

export interface OrderDocument {
  colorScheme: 'light' | 'dark'
  title: string
  body: string
}

export function OrderDocumentHandler(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: OrderDocument) {
    const logger = env.logger.child({ handler: 'OrderDocumentHandler' })
    const localEnv = { ...env, logger }
    const document = await orderDocument(localEnv)(input)
    return document
  }
}
