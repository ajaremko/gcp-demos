import 'server-only'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import {
  type CreateDocumentSpec,
  type DocumentCreated,
  type GetDocumentSpec,
  documentCreatedSchema,
} from './DocumentCreated'
import { stripeClient } from './StripeClient'

const DATA_ROOT = process.env.PDF_SHOP_DATA_DIR
if (!DATA_ROOT) {
  throw new Error('PDF_SHOP_DATA_DIR environment variable must be set')
}

const DOCUMENT_SPECS_DIR = path.join(DATA_ROOT, 'document-specs')

const DEMO_PRICE_CENTS = 999
const DEMO_PRICE_CURRENCY = 'usd'

function documentSpecFilePath(documentId: string) {
  return path.join(DOCUMENT_SPECS_DIR, `${documentId}.json`)
}

export async function createDocumentSpec(
  input: CreateDocumentSpec,
): Promise<DocumentCreated> {
  const documentId = randomUUID()

  const intent = await stripeClient.paymentIntents.create(
    {
      amount: DEMO_PRICE_CENTS,
      currency: DEMO_PRICE_CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: { documentId },
    },
    { idempotencyKey: `pdf-shop-payment-intent-${documentId}` },
  )

  const record: DocumentCreated = {
    id: documentId,
    createdAt: new Date().toISOString(),
    spec: {
      colorScheme: input.colorScheme,
      title: input.title,
      body: input.body,
    },
    payment: {
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
    },
  }

  await mkdir(DOCUMENT_SPECS_DIR, { recursive: true })
  await writeFile(
    documentSpecFilePath(record.id),
    JSON.stringify(record, null, 2),
    'utf-8',
  )

  return record
}

export async function getDocumentCreated(
  input: GetDocumentSpec,
): Promise<DocumentCreated | null> {
  try {
    const raw = await readFile(documentSpecFilePath(input.documentId), 'utf-8')
    return documentCreatedSchema.parse(JSON.parse(raw))
  } catch (err) {
    console.error('getDocumentCreated error:', err)
    return null
  }
}

export async function getPaymentIntentClientSecret(
  intentId: string,
): Promise<string | null> {
  const intent = await stripeClient.paymentIntents.retrieve(intentId)
  return intent.client_secret ?? null
}
