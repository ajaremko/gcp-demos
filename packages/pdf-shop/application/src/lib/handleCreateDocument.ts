import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { createDocumentSpecSchema } from '@org/pdf-shop-contracts'

import { createDocument } from './internal/createDocument'

export function handleCreateDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({ handler: 'handleCreateDocument' })
  return async function createDocumentHandler(input: object) {
    const parsed = createDocumentSpecSchema.parse(input)
    logger.debug({}, 'Invoking createDocument')
    const spec = await createDocument({ ...env, logger })(parsed)
    return spec
  }
}
