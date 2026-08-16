import { readFile, writeFile } from 'node:fs/promises'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { generateDocument } from './generateDocument'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

const documentId = '11111111-1111-1111-1111-111111111111'

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

  const spec = {
    colorScheme: 'dark' as const,
    title: 'Test Contract',
    body: 'Body text',
  }

  it('writes the generated document content and record', async () => {
    const record = await generateDocument({ dataRoot, logger })({
      documentId,
      spec,
    })

    expect(record).toEqual({
      documentId,
      path: `v1/documents/${documentId}`,
      filename: `${documentId}.txt`,
      contentType: 'text/plain',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const generatedText = await readFile(
      `${dataRoot}/v1/documents/${documentId}/generated.txt`,
      'utf-8',
    )
    expect(generatedText).toBe(
      `Generated document for spec ${documentId}\n\n{\n  "colorScheme": "dark",\n  "title": "Test Contract",\n  "body": "Body text"\n}`,
    )

    const generatedRecord = await readFile(
      `${dataRoot}/v1/documents/${documentId}/generated.json`,
      'utf-8',
    )
    expect(generatedRecord).toBe(
      `{"documentId":"${documentId}","path":"v1/documents/${documentId}","filename":"${documentId}.txt","contentType":"text/plain","timestamp":"2024-01-01T00:00:00.000Z"}`,
    )
  })

  it('throws FileIOFailed when the output cannot be written', async () => {
    const notADirectory = `${dataRoot}/not-a-directory`
    await writeFile(notADirectory, '', 'utf-8')

    await expect(
      generateDocument({ dataRoot: notADirectory, logger })({
        documentId,
        spec,
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
