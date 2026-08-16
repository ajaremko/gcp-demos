import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Stripe } from 'stripe'
import { type Logger } from 'pino'

import {
  type PaymentCompleted,
  type CompletePayment,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

import { StripeIntegrationFailed, FileIOFailed } from './errors'

export function completePayment(env: {
  stripe: Stripe
  dataRoot: string
  logger: Logger
}) {
  return async function (input: CompletePayment): Promise<PaymentCompleted> {
    const logger = env.logger.child({
      method: 'completePayment',
      paymentIntentId: input.paymentIntentId,
      documentId: input.documentId,
    })

    let stripePaymentIntentId: string
    let amount: number
    try {
      logger.trace({}, 'Retrieving payment intent from Stripe')
      const intent = await env.stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      )

      logger.trace(
        {
          intentStatus: intent.status,
          intentMetadata: intent.metadata,
        },
        'Checking payment intent status and metadata',
      )
      if (
        intent.status !== 'succeeded' ||
        intent.metadata.documentId !== input.documentId
      ) {
        throw new Error(
          'Payment was not successful or does not match the document ID',
        )
      }

      stripePaymentIntentId = intent.id
      amount = intent.amount
    } catch (err) {
      throw new StripeIntegrationFailed('Failed to verify payment intent', err)
    }

    try {
      // Prepare output directory
      logger.trace({}, 'Preparing output directory for payment record')
      const documentPath = encodeDocumentPath({
        documentId: input.documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
      await mkdir(outputDir, { recursive: true })

      logger.trace({}, 'Writing payment record to file')
      const record: PaymentCompleted = {
        documentId: input.documentId,
        stripePaymentIntentId,
        amount,
        currency: 'usd',
        confirmedAt: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = path.join(outputDir, 'paid.json')
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new FileIOFailed('Failed to write payment intent file', err)
    }
  }
}
