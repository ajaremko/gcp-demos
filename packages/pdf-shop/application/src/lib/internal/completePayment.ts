import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Stripe, type PaymentIntent } from 'stripe'
import { type Logger } from 'pino'

import {
  type PaymentCompleted,
  type CompletePayment,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

export class PaymentIntentNotFound {
  readonly tag = 'PaymentIntentNotFound'
  readonly message = 'Stripe payment intent could not be retrieved'
  constructor(readonly cause: unknown) {}
}

export class PaymentIntentInvalid {
  readonly tag = 'PaymentIntentInvalid'
  readonly message = 'Stripe payment intent failed validation checks'
  constructor(readonly cause: unknown) {}
}

export class PaymentRecordWriteFailed {
  readonly tag = 'PaymentRecordWriteFailed'
  readonly message = 'Failed to persist payment record to file'
  constructor(readonly cause: unknown) {}
}

export function completePayment(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  async function retreivePaymentIntent(paymentIntentId: string) {
    try {
      return await env.stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (err) {
      throw new PaymentIntentNotFound(err)
    }
  }

  async function validatePaymentIntent(
    documentId: string,
    paymentIntent: PaymentIntent,
  ) {
    try {
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
    paymentIntent: PaymentIntent,
  ) {
    try {
      const documentPath = encodeDocumentPath({
        documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
      await mkdir(outputDir, { recursive: true })

      const record: PaymentCompleted = {
        documentId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        confirmedAt: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = path.join(outputDir, 'paid.json')
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new PaymentRecordWriteFailed(err)
    }
  }

  return async function (input: CompletePayment): Promise<PaymentCompleted> {
    const logger = env.logger.child({
      method: 'completePayment',
      paymentIntentId: input.paymentIntentId,
      documentId: input.documentId,
    })

    logger.trace({}, 'Retrieving payment intent from Stripe')
    const intent = await retreivePaymentIntent(input.paymentIntentId)

    logger.trace(
      {
        intentStatus: intent.status,
        intentMetadata: intent.metadata,
      },
      'Checking payment intent status and metadata',
    )
    await validatePaymentIntent(input.documentId, intent)

    logger.trace({}, 'Writing payment record to file')
    const record = await writePaymentRecord(input.documentId, intent)

    return record
  }
}
