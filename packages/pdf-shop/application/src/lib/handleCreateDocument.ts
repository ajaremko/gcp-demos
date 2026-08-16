import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { createDocumentSpecSchema } from '@org/pdf-shop-contracts'

import { createDocument } from './internal/createDocument'

export function handleCreateDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: object) {
    const parsed = createDocumentSpecSchema.parse(input)
    const logger = env.logger.child({ handler: 'handleCreateDocument' })
    const localEnv = { ...env, logger }
    const spec = await createDocument(localEnv)(parsed)
    return spec
  }
}
