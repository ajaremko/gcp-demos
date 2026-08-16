import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { getDocumentCreated } from './getDocumentCreated'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

const documentId = '11111111-1111-1111-1111-111111111111'

describe('getDocumentCreated', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  it('reads and parses an existing document spec file', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/created.json`,
      `{"id":"${documentId}","createdAt":"2024-01-01T00:00:00.000Z","spec":{"colorScheme":"light","title":"Test Contract","body":"Body"},"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}}`,
      'utf-8',
    )

    const result = await getDocumentCreated({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual({
      id: documentId,
      createdAt: '2024-01-01T00:00:00.000Z',
      spec: { colorScheme: 'light', title: 'Test Contract', body: 'Body' },
      payment: { paymentIntentId: 'pi_1', amount: 999, currency: 'usd' },
    })
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getDocumentCreated({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file contains invalid JSON', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/created.json`,
      'not json',
      'utf-8',
    )

    await expect(
      getDocumentCreated({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file content fails schema validation', async () => {
    await mkdir(`${dataRoot}/v1/documents/${documentId}`, { recursive: true })
    await writeFile(
      `${dataRoot}/v1/documents/${documentId}/created.json`,
      '{"foo":"bar"}',
      'utf-8',
    )

    await expect(
      getDocumentCreated({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
