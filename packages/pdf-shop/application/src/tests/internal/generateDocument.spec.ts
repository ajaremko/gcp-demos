import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  generateDocument,
  GeneratedDocumentDirectoryFailed,
} from '../../lib/internal/generateDocument'
import {
  createTempDataRoot,
  createTestLogger,
  createFakePdfGenerator,
} from '../testEnv'

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
    const pdfGenerator = createFakePdfGenerator()
    const record = await generateDocument({ dataRoot, logger, pdfGenerator })({
      documentId: '11111111-1111-4111-8111-111111111111',
      spec: {
        colorScheme: 'dark',
        title: 'Test Contract',
        body: 'Body text',
      },
    })

    expect(record).toEqual({
      documentId: '11111111-1111-4111-8111-111111111111',
      path: `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf`,
      filename: '11111111-1111-4111-8111-111111111111.pdf',
      contentType: 'application/pdf',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedBytes = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf`,
    )
    expect(generatedBytes).toEqual(
      Buffer.from(new TextEncoder().encode('fake-pdf-content')),
    )

    const generatedRecord = await readFile(
      `${dataRoot}/generated/11111111-1111-4111-8111-111111111111.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        `"path":"${dataRoot}/generated/11111111-1111-4111-8111-111111111111.pdf",` +
        '"filename":"11111111-1111-4111-8111-111111111111.pdf",' +
        '"contentType":"application/pdf",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('throws GeneratedDocumentDirectoryFailed when the output directory cannot be prepared', async () => {
    // Point dataRoot at a file instead of a directory so mkdir(recursive)
    // fails with ENOTDIR - deterministic regardless of user/root. This only
    // exercises the first subfunction (prepareOutputDirectory); the other
    // two (writeGeneratedDocumentFile, writeGeneratedDocumentRecord) aren't
    // reachable via this fixture technique and have no test coverage here.
    await writeFile(`${dataRoot}/not-a-directory`, '', 'utf-8')

    const result = generateDocument({
      dataRoot: `${dataRoot}/not-a-directory`,
      logger,
      pdfGenerator: createFakePdfGenerator(),
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
