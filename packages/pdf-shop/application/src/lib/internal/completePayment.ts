import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Stripe } from 'stripe'

import {
  type PaymentCompleted,
  type CompletePayment,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

import { StripeIntegrationFailed, FileIOFailed } from './errors'

export function completePayment(env: { stripe: Stripe; dataRoot: string }) {
  return async function (input: CompletePayment): Promise<PaymentCompleted> {
    try {
      const intent = await env.stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      )

      if (
        intent.status !== 'succeeded' ||
        intent.metadata.documentId !== input.documentId
      ) {
        throw new Error(
          'Payment was not successful or does not match the document ID',
        )
      }

      try {
        // Prepare output directory
        const documentPath = encodeDocumentPath({
          documentId: input.documentId,
          version: 1,
        })
        const outputDir = path.join(env.dataRoot, documentPath)
        await mkdir(outputDir, { recursive: true })

        const record: PaymentCompleted = {
          documentId: input.documentId,
          stripePaymentIntentId: intent.id,
          amount: intent.amount,
          currency: 'usd',
          confirmedAt: new Date().toISOString(),
        }

        const recordData = JSON.stringify(record, null, 2)
        const recordPath = path.join(outputDir, 'paid.json')
        await writeFile(recordPath, recordData, 'utf-8')

        return record
      } catch (err) {
        throw new FileIOFailed('Failed to write payment intent file', err)
      }
    } catch (err) {
      throw new StripeIntegrationFailed('Failed to verify payment intent', err)
    }
  }
}
