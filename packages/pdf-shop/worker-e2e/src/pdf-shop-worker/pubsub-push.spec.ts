import { describe, it, expect } from 'vitest'
import axios from 'axios'

describe('POST /', () => {
  it('accepts a Cloud Storage document-created notification pushed via Pub/Sub', async () => {
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
          objectId: '11111111-1111-4111-8111-111111111111/created.json',
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
  })
})
