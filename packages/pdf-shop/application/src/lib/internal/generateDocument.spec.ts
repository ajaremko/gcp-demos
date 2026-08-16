import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encodeDocumentPath } from '@org/pdf-shop-contracts'

import { generateDocument } from './generateDocument'
import { FileIOFailed } from './errors'
import { createTempDataRoot, createTestLogger } from '../../test-support/testEnv'

describe('generateDocument', () => {
  let dataRoot: string
  let cleanup: () => Promise<void>
  const logger = createTestLogger()

  beforeEach(async () => {
    ;({ dataRoot, cleanup } = await createTempDataRoot())
  })

  afterEach(async () => {
    await cleanup()
  })

  const spec = {
    colorScheme: 'dark' as const,
    title: 'Test Contract',
    body: 'Body text',
  }

  it('writes the generated document content and record', async () => {
    const documentId = randomUUID()

    const record = await generateDocument({ dataRoot, logger })({
      documentId,
      spec,
    })

    expect(record).toMatchObject({
      documentId,
      filename: `${documentId}.txt`,
      contentType: 'text/plain',
    })

    const documentPath = encodeDocumentPath({ documentId, version: 1 })
    const dir = path.join(dataRoot, documentPath)

    const generatedText = await readFile(
      path.join(dir, 'generated.txt'),
      'utf-8',
    )
    expect(generatedText).toContain(documentId)
    expect(generatedText).toContain(spec.title)

    const generatedRecord = await readFile(
      path.join(dir, 'generated.json'),
      'utf-8',
    )
    expect(JSON.parse(generatedRecord)).toEqual(record)
  })

  it('throws FileIOFailed when the output cannot be written', async () => {
    const notADirectory = path.join(dataRoot, 'not-a-directory')
    await writeFile(notADirectory, '', 'utf-8')

    await expect(
      generateDocument({ dataRoot: notADirectory, logger })({
        documentId: randomUUID(),
        spec,
      }),
    ).rejects.toBeInstanceOf(FileIOFailed)
  })
})
