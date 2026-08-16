import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encodeDocumentPath,
  type DocumentCreated,
} from '@org/pdf-shop-contracts'

import { getDocumentCreated } from './getDocumentCreated'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

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
    const documentId = randomUUID()
    const record: DocumentCreated = {
      id: documentId,
      createdAt: new Date().toISOString(),
      spec: { colorScheme: 'light', title: 'Test Contract', body: 'Body' },
      payment: { paymentIntentId: 'pi_1', amount: 999, currency: 'usd' },
    }

    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'created.json'),
      JSON.stringify(record),
      'utf-8',
    )

    const result = await getDocumentCreated({ dataRoot, logger })({
      documentId,
    })

    expect(result).toEqual(record)
  })

  it('throws FileIOFailed when the file does not exist', async () => {
    await expect(
      getDocumentCreated({ dataRoot, logger })({ documentId: randomUUID() }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file contains invalid JSON', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'created.json'), 'not json', 'utf-8')

    await expect(
      getDocumentCreated({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })

  it('throws FileIOFailed when the file content fails schema validation', async () => {
    const documentId = randomUUID()
    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)
    await mkdir(dir, { recursive: true })
    await writeFile(
      path.join(dir, 'created.json'),
      JSON.stringify({ foo: 'bar' }),
      'utf-8',
    )

    await expect(
      getDocumentCreated({ dataRoot, logger })({ documentId }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
