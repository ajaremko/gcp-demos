import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type GenerationRecord } from './data/GenerationRecord'
import { type DocumentSpec } from './data/DocumentSpec'

/** The document's output directory could not be created. */
export class GeneratedDocumentDirectoryFailed extends ApplicationError {
  readonly tag = 'GeneratedDocumentDirectoryFailed'
  constructor(cause: unknown) {
    super('Failed to prepare output directory for document', cause)
  }
}

/** The generated document content could not be written to disk. */
export class GeneratedDocumentWriteFailed extends ApplicationError {
  readonly tag = 'GeneratedDocumentWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write generated document file', cause)
  }
}

/** The generation record (`generated.json`) could not be written to disk. */
export class GenerationRecordWriteFailed extends ApplicationError {
  readonly tag = 'GenerationRecordWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write generation record', cause)
  }
}

/**
 * Generates a document's content from its spec and writes both the
 * generated file (`generated.txt`) and its metadata record (`generated.json`)
 * under the document's directory.
 *
 * @param env.dataRoot - Root directory where per-document records are stored.
 * @param env.logger - Logger; a child logger is created once per instantiation.
 * @returns An async function that takes `{documentId, spec}` (`spec` is a
 *   {@link DocumentSpec}) and resolves to the written {@link GenerationRecord}.
 * @throws {GeneratedDocumentDirectoryFailed} If the document's output directory cannot be prepared.
 * @throws {GeneratedDocumentWriteFailed} If the generated content cannot be written to disk.
 * @throws {GenerationRecordWriteFailed} If the generation record cannot be written to disk.
 *
 * @example
 * const record = await generateDocument({ dataRoot, logger })({
 *   documentId: '11111111-1111-4111-8111-111111111111',
 *   spec: { colorScheme: 'dark', title: 'Test Contract', body: 'Body text' },
 * })
 * // record.filename === '11111111-1111-4111-8111-111111111111.txt'
 */
export function generateDocument(env: { dataRoot: string; logger: Logger }) {
  const logger = env.logger.child({
    method: 'generateDocument',
  })

  async function prepareOutputDirectory(documentId: string) {
    try {
      const outputDir = path.join(env.dataRoot, 'generated')
      logger.trace(
        {
          documentId,
          path: outputDir,
        },
        'Preparing output directory for document',
      )
      await mkdir(outputDir, { recursive: true })
      return outputDir
    } catch (err) {
      logger.debug(
        {
          documentId,
          path: env.dataRoot,
        },
        'Failed to prepare output directory for document',
      )
      throw new GeneratedDocumentDirectoryFailed(err)
    }
  }

  async function writeDocument(
    outputDir: string,
    documentId: string,
    spec: DocumentSpec,
  ) {
    try {
      const generatedData = `Generated document for spec ${documentId}\n\n${JSON.stringify(spec, null, 2)}`
      const generatedPath = path.join(outputDir, `${documentId}.txt`)
      logger.trace(
        {
          documentId,
          path: generatedPath,
        },
        'Writing generated document file',
      )
      await writeFile(generatedPath, generatedData, 'utf-8')
      return generatedPath
    } catch (err) {
      logger.debug(
        {
          documentId,
          path: outputDir,
        },
        'Failed to write generated document file',
      )
      throw new GeneratedDocumentWriteFailed(err)
    }
  }

  async function writeRecord(
    outputDir: string,
    generatedPath: string,
    documentId: string,
  ) {
    try {
      const record: GenerationRecord = {
        documentId: documentId,
        path: generatedPath,
        filename: `${documentId}.txt`,
        contentType: 'text/plain',
        timestamp: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = path.join(outputDir, `${documentId}.json`)
      logger.trace(
        {
          documentId: record.documentId,
          path: recordPath,
          filename: record.filename,
          contentType: record.contentType,
        },
        'Writing generated document record',
      )
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      logger.debug(
        {
          documentId,
          path: outputDir,
        },
        'Failed to write generation record',
      )
      throw new GenerationRecordWriteFailed(err)
    }
  }

  return async function (input: {
    documentId: string
    spec: DocumentSpec
  }): Promise<GenerationRecord> {
    const outputDir = await prepareOutputDirectory(input.documentId)
    const generatedPath = await writeDocument(
      outputDir,
      input.documentId,
      input.spec,
    )
    return writeRecord(outputDir, generatedPath, input.documentId)
  }
}
