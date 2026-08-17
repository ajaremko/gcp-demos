import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { type DocumentCreated } from './records'
import { encodeDocumentPath } from './documentPath'
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
  async function createPaymentIntent(documentId: string) {
    try {
      const intent = await env.stripe.paymentIntents.create(
        {
          amount: DEMO_PRICE_CENTS,
          currency: DEMO_PRICE_CURRENCY,
          automatic_payment_methods: { enabled: true },
          metadata: { documentId },
        },
        { idempotencyKey: `pdf-shop-payment-intent-${documentId}` },
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
      const documentPath = encodeDocumentPath({
        documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
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
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new DocumentRecordWriteFailed(err)
    }
  }

  return async function (input: CreateDocument): Promise<DocumentCreated> {
    const documentId = randomUUID()

    const logger = env.logger.child({
      method: 'createDocument',
      documentId,
    })

    logger.trace({}, 'Creating payment intent with Stripe')
    const payment = await createPaymentIntent(documentId)

    logger.trace({}, 'Writing document record to file')
    const record = await writeDocumentRecord(documentId, input, payment)

    return record
  }
}
