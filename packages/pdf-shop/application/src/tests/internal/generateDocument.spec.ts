import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  generateDocument,
  GeneratedDocumentDirectoryFailed,
} from '../../lib/internal/generateDocument'
import { createTempDataRoot, createTestLogger } from '../testEnv'

describe('generateDocument', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await cleanup()
  })

  it('writes the generated document content and record', async () => {
    const record = await generateDocument({ dataRoot, logger })({
      documentId: '11111111-1111-4111-8111-111111111111',
      spec: {
        colorScheme: 'dark',
        title: 'Test Contract',
        body: 'Body text',
      },
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt`,
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedText = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt`,
      'utf-8',
    )
    expect(generatedText).toBe(
      'Generated document for spec 11111111-1111-4111-8111-111111111111\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}',
    )

    const generatedRecord = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        `"path":"${dataRoot}/generated/11111111-1111-4111-8111-111111111111.txt",` +
        '"filename":"11111111-1111-4111-8111-111111111111.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('throws GeneratedDocumentDirectoryFailed when the output directory cannot be prepared', async () => {
    // Point dataRoot at a file instead of a directory so mkdir(recursive)
    // fails with ENOTDIR — deterministic regardless of user/root. This only
    // exercises the first subfunction (prepareOutputDirectory); the other
    // two (writeGeneratedDocumentFile, writeGeneratedDocumentRecord) aren't
    // reachable via this fixture technique and have no test coverage here.
    await writeFile(`${dataRoot}/not-a-directory`, '', 'utf-8')

    const result = generateDocument({
      dataRoot: `${dataRoot}/not-a-directory`,
      logger,
    })({
      documentId: '11111111-1111-4111-8111-111111111111',
      spec: {
        colorScheme: 'dark',
        title: 'Test Contract',
        body: 'Body text',
      },
    })
    await expect(result).rejects.toBeInstanceOf(
      GeneratedDocumentDirectoryFailed,
    )
  })
})
