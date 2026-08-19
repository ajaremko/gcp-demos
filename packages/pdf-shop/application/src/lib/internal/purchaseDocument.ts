import { mkdir, writeFile } from 'node:fs/promises'
import type Stripe from 'stripe'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type PaymentRecord } from './data/PaymentRecord'
import { recordDir, buildRecordPath } from './recordPath'

/** The Stripe payment intent for the purchase could not be retrieved. */
export class PaymentIntentNotFound extends ApplicationError {
  readonly tag = 'PaymentIntentNotFound'
  constructor(cause: unknown) {
    super('Stripe payment intent could not be retrieved', cause)
  }
}

/**
 * The retrieved payment intent did not succeed, or its `documentId`
 * metadata doesn't match the document being purchased.
 */
export class PaymentIntentInvalid extends ApplicationError {
  readonly tag = 'PaymentIntentInvalid'
  constructor(cause: unknown) {
    super('Stripe payment intent failed validation checks', cause)
  }
}

/** The payment confirmation record (`paid.json`) could not be written to disk. */
export class PaymentRecordWriteFailed extends ApplicationError {
  readonly tag = 'PaymentRecordWriteFailed'
  constructor(cause: unknown) {
    super('Failed to persist payment record to file', cause)
  }
}

type PurchaseDocument = {
  documentId: string
  paymentIntentId: string
}

/**
 * Confirms a document purchase: retrieves the Stripe payment intent, checks
 * that it succeeded and belongs to the given document, then writes a
 * payment confirmation record (`paid.json`).
 *
 * @param env.stripe - Stripe client used to retrieve the payment intent.
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes `{documentId, paymentIntentId}` and
 *   resolves to the written {@link PaymentRecord}.
 * @throws {PaymentIntentNotFound} If Stripe fails to retrieve the payment intent.
 * @throws {PaymentIntentInvalid} If the intent did not succeed, or its
 *   metadata `documentId` doesn't match the one being purchased.
 * @throws {PaymentRecordWriteFailed} If the payment record cannot be written to disk.
 *
 * @example
 * const record = await purchaseDocument({ stripe, dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 *   paymentIntentId: 'pi_1',
 * })
 * // record.stripePaymentIntentId === 'pi_1'
 */
export function purchaseDocument(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  const logger = env.logger.child({
    method: 'purchaseDocument',
  })

  async function retreivePaymentIntent(paymentIntentId: string) {
    try {
      logger.trace({ paymentIntentId }, 'Retrieving payment intent from Stripe')
      return await env.stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (err) {
      logger.debug(
        { paymentIntentId },
        'Stripe payment intent could not be retrieved',
      )
      throw new PaymentIntentNotFound(err)
    }
  }

  async function validatePaymentIntent(
    documentId: string,
    paymentIntent: Stripe.PaymentIntent,
  ) {
    try {
      logger.trace(
        {
          documentId,
          intentStatus: paymentIntent.status,
          intentMetadata: paymentIntent.metadata,
        },
        'Checking payment intent status and metadata',
      )
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment intent is not successful')
      }
      if (paymentIntent.metadata.documentId !== documentId) {
        throw new Error(
          'Payment intent does not have a matching document ID in metadata',
        )
      }
    } catch (err) {
      logger.debug(
        {
          documentId,
          intentStatus: paymentIntent.status,
          intentMetadata: paymentIntent.metadata,
        },
        'Stripe payment intent failed validation checks',
      )
      throw new PaymentIntentInvalid(err)
    }
  }

  async function writePaymentRecord(
    documentId: string,
    paymentIntent: Stripe.PaymentIntent,
  ) {
    try {
      const outputDir = recordDir(env.dataRoot, 'paid')
      await mkdir(outputDir, { recursive: true })

      const record: PaymentRecord = {
        documentId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        confirmedAt: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = buildRecordPath(env.dataRoot, 'paid', documentId)
      logger.trace(
        {
          documentId,
          path: recordPath,
          stripePaymentIntentId: record.stripePaymentIntentId,
        },
        'Writing payment record to file',
      )
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      logger.debug(
        { documentId, path: env.dataRoot },
        'Failed to persist payment record to file',
      )
      throw new PaymentRecordWriteFailed(err)
    }
  }

  return async function (input: PurchaseDocument): Promise<PaymentRecord> {
    const intent = await retreivePaymentIntent(input.paymentIntentId)
    await validatePaymentIntent(input.documentId, intent)
    return writePaymentRecord(input.documentId, intent)
  }
}
