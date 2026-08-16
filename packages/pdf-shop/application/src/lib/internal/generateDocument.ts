import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Logger } from 'pino'

import {
  type DocumentGenerated,
  type GenerateDocument,
  encodeDocumentPath,
} from '@org/pdf-shop-contracts'

import { ApplicationError } from '../ApplicationError'

export class GeneratedDocumentDirectoryFailed extends ApplicationError {
  readonly tag = 'GeneratedDocumentDirectoryFailed'
  constructor(cause: unknown) {
    super('Failed to prepare output directory for document', cause)
  }
}

export class GeneratedDocumentFileWriteFailed extends ApplicationError {
  readonly tag = 'GeneratedDocumentFileWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write generated document file', cause)
  }
}

export class GeneratedDocumentRecordWriteFailed extends ApplicationError {
  readonly tag = 'GeneratedDocumentRecordWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write generated document record', cause)
  }
}

export function generateDocument(env: { dataRoot: string; logger: Logger }) {
  async function prepareOutputDirectory(documentId: string) {
    try {
      const documentPath = encodeDocumentPath({
        documentId,
        version: 1,
      })
      const outputDir = path.join(env.dataRoot, documentPath)
      await mkdir(outputDir, { recursive: true })
      return { documentPath, outputDir }
    } catch (err) {
      throw new GeneratedDocumentDirectoryFailed(err)
    }
  }

  async function writeGeneratedDocumentFile(
    outputDir: string,
    input: GenerateDocument,
  ) {
    try {
      const generatedData = `Generated document for spec ${input.documentId}\n\n${JSON.stringify(input.spec, null, 2)}`
      const generatedPath = path.join(outputDir, `generated.txt`)
      await writeFile(generatedPath, generatedData, 'utf-8')
    } catch (err) {
      throw new GeneratedDocumentFileWriteFailed(err)
    }
  }

  async function writeGeneratedDocumentRecord(
    outputDir: string,
    documentPath: string,
    input: GenerateDocument,
  ) {
    try {
      const record: DocumentGenerated = {
        documentId: input.documentId,
        path: documentPath,
        filename: `${input.documentId}.txt`,
        contentType: 'text/plain',
        timestamp: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = path.join(outputDir, 'generated.json')
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new GeneratedDocumentRecordWriteFailed(err)
    }
  }

  return async function (input: GenerateDocument): Promise<DocumentGenerated> {
    const logger = env.logger.child({
      method: 'generateDocument',
      documentId: input.documentId,
    })

    logger.trace({}, 'Preparing output directory for document')
    const { documentPath, outputDir } = await prepareOutputDirectory(
      input.documentId,
    )

    logger.trace({}, 'Writing generated document file')
    await writeGeneratedDocumentFile(outputDir, input)

    logger.trace({}, 'Writing generated document record')
    return writeGeneratedDocumentRecord(outputDir, documentPath, input)
  }
}
