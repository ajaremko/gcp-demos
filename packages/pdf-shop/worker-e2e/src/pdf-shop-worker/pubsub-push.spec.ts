import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect } from 'vitest'
import axios from 'axios'

describe('POST /', () => {
  it('generates the document when a Cloud Storage document-created notification is pushed via Pub/Sub', async () => {
    await mkdir(
      '/tmp/pdf-shop-worker-data/11111111-1111-4111-8111-111111111111',
      { recursive: true },
    )
    await writeFile(
      '/tmp/pdf-shop-worker-data/11111111-1111-4111-8111-111111111111/created.json',
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"dark","title":"Test Contract","body":"Body text"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )

    const data = Buffer.from(
      JSON.stringify({
        kind: 'storage#object',
        id: 'pdf-shop-documents/11111111-1111-4111-8111-111111111111/created.json/1700000000000000',
        name: '11111111-1111-4111-8111-111111111111/created.json',
        bucket: 'pdf-shop-documents',
        generation: '1700000000000000',
        metageneration: '1',
        contentType: 'application/json',
        timeCreated: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
        size: '512',
      }),
    ).toString('base64')

    const res = await axios.post('/', {
      message: {
        attributes: {
          eventType: 'OBJECT_FINALIZE',
          bucketId: 'pdf-shop-documents',
          objectId:
            '/tmp/pdf-shop-worker-data/11111111-1111-4111-8111-111111111111/created.json',
          objectGeneration: '1700000000000000',
          payloadFormat: 'JSON_API_V1',
        },
        data,
        messageId: '2070443601311540',
        publishTime: '2024-01-01T00:00:00.000Z',
      },
      subscription: 'projects/pdf-shop/subscriptions/pdf-shop-worker-push',
    })

    expect(res.status).toBe(201)

    const generatedText = await readFile(
      '/tmp/pdf-shop-worker-data/11111111-1111-4111-8111-111111111111/generated.txt',
      'utf-8',
    )
    expect(generatedText).toBe(
      'Generated document for spec 11111111-1111-4111-8111-111111111111\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}',
    )

    // timestamp reflects the real clock of the live worker process, so it
    // can't be hardcoded the way the unit-level handler specs do with fake
    // timers — asserted structurally instead.
    const generatedRecord = JSON.parse(
      await readFile(
        '/tmp/pdf-shop-worker-data/11111111-1111-4111-8111-111111111111/generated.json',
        'utf-8',
      ),
    )
    expect(generatedRecord).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: '11111111-1111-4111-8111-111111111111',
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: expect.any(String),
    })
  })

  it('acknowledges but ignores a finalize notification for a non-created.json object', async () => {
    const data = Buffer.from(
      JSON.stringify({
        kind: 'storage#object',
        name: '22222222-2222-4222-8222-222222222222/generated.json',
        bucket: 'pdf-shop-documents',
      }),
    ).toString('base64')

    const res = await axios.post('/', {
      message: {
        attributes: {
          eventType: 'OBJECT_FINALIZE',
          bucketId: 'pdf-shop-documents',
          objectId:
            '/tmp/pdf-shop-worker-data/22222222-2222-4222-8222-222222222222/generated.json',
          objectGeneration: '1700000000000001',
          payloadFormat: 'JSON_API_V1',
        },
        data,
        messageId: '2070443601311541',
        publishTime: '2024-01-01T00:00:00.000Z',
      },
      subscription: 'projects/pdf-shop/subscriptions/pdf-shop-worker-push',
    })

    expect(res.status).toBe(201)
  })

  it('returns 500 when the referenced document record does not exist', async () => {
    const data = Buffer.from(
      JSON.stringify({
        kind: 'storage#object',
        name: '33333333-3333-4333-8333-333333333333/created.json',
        bucket: 'pdf-shop-documents',
      }),
    ).toString('base64')

    const res = await axios.post(
      '/',
      {
        message: {
          attributes: {
            eventType: 'OBJECT_FINALIZE',
            bucketId: 'pdf-shop-documents',
            objectId:
              '/tmp/pdf-shop-worker-data/33333333-3333-4333-8333-333333333333/created.json',
            objectGeneration: '1700000000000002',
            payloadFormat: 'JSON_API_V1',
          },
          data,
          messageId: '2070443601311542',
          publishTime: '2024-01-01T00:00:00.000Z',
        },
        subscription: 'projects/pdf-shop/subscriptions/pdf-shop-worker-push',
      },
      { validateStatus: () => true },
    )

    expect(res.status).toBe(500)
  })
})
