import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { generateDocument } from './generateDocument'
import { FileIOFailed } from './errors'
import {
  createTempDataRoot,
  createTestLogger,
} from '../../test-support/testEnv'

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
      path: 'v1/documents/11111111-1111-4111-8111-111111111111',
      filename: '11111111-1111-4111-8111-111111111111.txt',
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedText = await readFile(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111/generated.txt`,
      'utf-8',
    )
    expect(generatedText).toBe(
      'Generated document for spec 11111111-1111-4111-8111-111111111111\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}',
    )

    const generatedRecord = await readFile(
      `${dataRoot}/v1/documents/11111111-1111-4111-8111-111111111111/generated.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      '{' +
        '"documentId":"11111111-1111-4111-8111-111111111111",' +
        '"path":"v1/documents/11111111-1111-4111-8111-111111111111",' +
        '"filename":"11111111-1111-4111-8111-111111111111.txt",' +
        '"contentType":"text/plain",' +
        '"timestamp":"2024-01-01T00:00:00.000Z"' +
        '}',
    )
  })

  it('throws FileIOFailed when the output cannot be written', async () => {
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
    await expect(result).rejects.toBeInstanceOf(FileIOFailed)
  })
})
