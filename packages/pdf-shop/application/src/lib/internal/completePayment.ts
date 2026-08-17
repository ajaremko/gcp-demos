import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type Stripe from 'stripe'
import { type Logger } from 'pino'

import { type PaymentCompleted } from './records'
import { ApplicationError } from '../ApplicationError'

type CompletePayment = {
  documentId: string
  paymentIntentId: string
}

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
    paymentIntent: Stripe.PaymentIntent,
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
    paymentIntent: Stripe.PaymentIntent,
  ) {
    try {
      const outputDir = path.join(env.dataRoot, documentId)
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
