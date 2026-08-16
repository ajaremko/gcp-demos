import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import {
  type CreateDocument,
  type DocumentCreated,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

import { StripeIntegrationFailed, FileIOFailed } from './errors'

const DEMO_PRICE_CENTS = 999
const DEMO_PRICE_CURRENCY = 'usd'

export function createDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CreateDocument): Promise<DocumentCreated> {
    const documentId = randomUUID()

    const logger = env.logger.child({
      method: 'createDocument',
      documentId,
    })

    let payment: { paymentIntentId: string; amount: number; currency: string }
    try {
      logger.trace({}, 'Creating payment intent with Stripe')
      const intent = await env.stripe.paymentIntents.create(
        {
          amount: DEMO_PRICE_CENTS,
          currency: DEMO_PRICE_CURRENCY,
          automatic_payment_methods: { enabled: true },
          metadata: { documentId },
        },
        { idempotencyKey: `pdf-shop-payment-intent-${documentId}` },
      )
      payment = {
        paymentIntentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
      }
    } catch (err) {
      throw new StripeIntegrationFailed('Failed to create payment intent', err)
    }

    try {
      logger.trace({}, 'Preparing output directory for document')
      // Prepare output directory
      const documentPath = encodeDocumentPath({
        documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
      await mkdir(outputDir, { recursive: true })

      // Write a record of the requested spec and payment intent
      logger.trace({}, 'Writing document record to file')
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
      throw new FileIOFailed('Failed to write document spec file', err)
    }
  }
}
