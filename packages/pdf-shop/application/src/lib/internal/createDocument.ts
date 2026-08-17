import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { type DocumentCreated } from './records'
import { ApplicationError } from '../ApplicationError'

const DEMO_PRICE_CENTS = 999
const DEMO_PRICE_CURRENCY = 'usd'

type CreateDocument = {
  colorScheme: 'light' | 'dark'
  title: string
  body: string
}

export class PaymentIntentCreationFailed extends ApplicationError {
  readonly tag = 'PaymentIntentCreationFailed'
  constructor(cause: unknown) {
    super('Failed to create payment intent with Stripe', cause)
  }
}

export class DocumentRecordWriteFailed extends ApplicationError {
  readonly tag = 'DocumentRecordWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write document record to file', cause)
  }
}

export function createDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({
    method: 'createDocument',
  })

  async function createPaymentIntent(documentId: string) {
    try {
      const idempotencyKey = `pdf-shop-payment-intent-${documentId}`
      logger.trace(
        { documentId, idempotencyKey },
        'Creating payment intent with Stripe',
      )
      const intent = await env.stripe.paymentIntents.create(
        {
          amount: DEMO_PRICE_CENTS,
          currency: DEMO_PRICE_CURRENCY,
          automatic_payment_methods: { enabled: true },
          metadata: { documentId },
        },
        { idempotencyKey },
      )
      return {
        paymentIntentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
      }
    } catch (err) {
      throw new PaymentIntentCreationFailed(err)
    }
  }

  async function writeDocumentRecord(
    documentId: string,
    input: CreateDocument,
    payment: { paymentIntentId: string; amount: number; currency: string },
  ) {
    try {
      const outputDir = path.join(env.dataRoot, documentId)
      await mkdir(outputDir, { recursive: true })

      const record: DocumentCreated = {
        id: documentId,
        createdAt: new Date().toISOString(),
        spec: {
          colorScheme: input.colorScheme,
          title: input.title,
          body: input.body,
        },
        payment,
      }

      const recordPath = path.join(outputDir, 'created.json')
      const recordData = JSON.stringify(record)
      logger.trace(
        {
          documentId,
          path: recordPath,
          paymentIntentId: payment.paymentIntentId,
        },
        'Writing document record to file',
      )
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new DocumentRecordWriteFailed(err)
    }
  }

  return async function (input: CreateDocument): Promise<DocumentCreated> {
    const documentId = randomUUID()

    const payment = await createPaymentIntent(documentId)
    return writeDocumentRecord(documentId, input, payment)
  }
}
