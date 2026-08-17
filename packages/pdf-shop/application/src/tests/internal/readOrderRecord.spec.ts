import { mkdir, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  readOrderRecord,
  DocumentOrderNotFound,
  DocumentOrderInvalid,
} from '../../lib/internal/readOrderRecord'
import { createTempDataRoot, createTestLogger } from '../testEnv'

describe('readOrderRecord', () => {
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
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"light","title":"Test Contract","body":"Body"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )

    const result = await readOrderRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(result).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: '2024-01-01T00:00:00.000Z',
      spec: { colorScheme: 'light', title: 'Test Contract', body: 'Body' },
      payment: { paymentIntentId: 'pi_1', amount: 999, currency: 'usd' },
    })
  })

  it('reads and parses an existing document spec file by path', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{' +
        '"id":"11111111-1111-4111-8111-111111111111",' +
        '"createdAt":"2024-01-01T00:00:00.000Z",' +
        '"spec":{"colorScheme":"light","title":"Test Contract","body":"Body"},' +
        '"payment":{"paymentIntentId":"pi_1","amount":999,"currency":"usd"}' +
        '}',
      'utf-8',
    )

    const result = await readOrderRecord({ dataRoot, logger })({
      path: `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
    })

    expect(result).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: '2024-01-01T00:00:00.000Z',
      spec: { colorScheme: 'light', title: 'Test Contract', body: 'Body' },
      payment: { paymentIntentId: 'pi_1', amount: 999, currency: 'usd' },
    })
  })

  it('throws DocumentOrderNotFound when the file does not exist', async () => {
    const result = readOrderRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(DocumentOrderNotFound)
  })

  it('throws DocumentOrderInvalid when the file contains invalid JSON', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      'not json',
      'utf-8',
    )

    const result = readOrderRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(DocumentOrderInvalid)
  })

  it('throws DocumentOrderInvalid when the file content fails schema validation', async () => {
    await mkdir(`${dataRoot}/11111111-1111-4111-8111-111111111111`, {
      recursive: true,
    })
    await writeFile(
      `${dataRoot}/11111111-1111-4111-8111-111111111111/created.json`,
      '{"foo":"bar"}',
      'utf-8',
    )

    const result = readOrderRecord({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
    })
    await expect(result).rejects.toBeInstanceOf(DocumentOrderInvalid)
  })
})
