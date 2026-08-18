import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type OrderRecord } from './data/OrderRecord'

const DEMO_PRICE_CENTS = 999
const DEMO_PRICE_CURRENCY = 'usd'

/** Stripe failed to create the payment intent for a new order. */
export class PaymentIntentCreationFailed extends ApplicationError {
  readonly tag = 'PaymentIntentCreationFailed'
  constructor(cause: unknown) {
    super('Failed to create payment intent with Stripe', cause)
  }
}

/** The order record (`created.json`) could not be written to disk. */
export class OrderRecordWriteFailed extends ApplicationError {
  readonly tag = 'OrderRecordWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write document record to file', cause)
  }
}

/**
 * Places an order for a document: creates a Stripe payment intent for the
 * fixed demo price, then writes an order record (`created.json`) under a
 * freshly generated document id.
 *
 * @param env.stripe - Stripe client used to create the payment intent.
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes the document spec (`colorScheme`,
 *   `title`, `body`) and resolves to the written {@link OrderRecord}.
 * @throws {PaymentIntentCreationFailed} If Stripe fails to create the payment intent.
 * @throws {OrderRecordWriteFailed} If the order record cannot be written to disk.
 *
 * @example
 * const record = await orderDocument({ stripe, dataRoot, logger })({
 *   colorScheme: 'light',
 *   title: 'Test',
 *   body: 'Body',
 * })
 * // record.id === '11111111-1111-4111-8111-111111111111'
 * // record.payment.paymentIntentId === 'pi_1'
 */
export function orderDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({
    method: 'orderDocument',
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
      logger.debug(
        { documentId },
        'Failed to create payment intent with Stripe',
      )
      throw new PaymentIntentCreationFailed(err)
    }
  }

  async function writeRecord(
    documentId: string,
    spec: {
      colorScheme: 'light' | 'dark'
      title: string
      body: string
    },
    payment: { paymentIntentId: string; amount: number; currency: string },
  ) {
    try {
      const outputDir = path.join(env.dataRoot, documentId)
      await mkdir(outputDir, { recursive: true })

      const record: OrderRecord = {
        id: documentId,
        createdAt: new Date().toISOString(),
        spec: {
          colorScheme: spec.colorScheme,
          title: spec.title,
          body: spec.body,
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
      logger.debug(
        { documentId, path: env.dataRoot },
        'Failed to write document record to file',
      )
      throw new OrderRecordWriteFailed(err)
    }
  }

  return async function (input: {
    colorScheme: 'light' | 'dark'
    title: string
    body: string
  }): Promise<OrderRecord> {
    const documentId = randomUUID()

    const payment = await createPaymentIntent(documentId)
    return writeRecord(documentId, input, payment)
  }
}
