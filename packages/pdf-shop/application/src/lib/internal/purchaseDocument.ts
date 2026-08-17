import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type Stripe from 'stripe'
import { type Logger } from 'pino'

import { type PaymentRecord } from './data/PaymentRecord'
import { ApplicationError } from '../ApplicationError'

export class PaymentIntentNotFound extends ApplicationError {
  readonly tag = 'PaymentIntentNotFound'
  constructor(cause: unknown) {
    super('Stripe payment intent could not be retrieved', cause)
  }
}

export class PaymentIntentInvalid extends ApplicationError {
  readonly tag = 'PaymentIntentInvalid'
  constructor(cause: unknown) {
    super('Stripe payment intent failed validation checks', cause)
  }
}

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
      throw new PaymentIntentInvalid(err)
    }
  }

  async function writePaymentRecord(
    documentId: string,
    paymentIntent: Stripe.PaymentIntent,
  ) {
    try {
      const outputDir = path.join(env.dataRoot, documentId)
      await mkdir(outputDir, { recursive: true })

      const record: PaymentRecord = {
        documentId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        confirmedAt: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = path.join(outputDir, 'paid.json')
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
      throw new PaymentRecordWriteFailed(err)
    }
  }

  return async function (input: PurchaseDocument): Promise<PaymentRecord> {
    const intent = await retreivePaymentIntent(input.paymentIntentId)
    await validatePaymentIntent(input.documentId, intent)
    return writePaymentRecord(input.documentId, intent)
  }
}
