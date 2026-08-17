import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Logger } from 'pino'

import { type DocumentGenerated, type DocumentSpec } from './records'
import { ApplicationError } from '../ApplicationError'

type GenerateDocument = {
  documentId: string
  spec: DocumentSpec
}

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
  const logger = env.logger.child({
    method: 'generateDocument',
  })

  async function prepareOutputDirectory(documentId: string) {
    try {
      const outputDir = path.join(env.dataRoot, documentId)
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
      logger.trace(
        {
          documentId: input.documentId,
          path: generatedPath,
        },
        'Writing generated document record',
      )
      await writeFile(generatedPath, generatedData, 'utf-8')
      return generatedPath
    } catch (err) {
      throw new GeneratedDocumentFileWriteFailed(err)
    }
  }

  async function writeGeneratedDocumentRecord(
    outputDir: string,
    generatedPath: string,
    input: GenerateDocument,
  ) {
    try {
      const record: DocumentGenerated = {
        documentId: input.documentId,
        path: generatedPath,
        filename: `${input.documentId}.txt`,
        contentType: 'text/plain',
        timestamp: new Date().toISOString(),
      }

      const recordData = JSON.stringify(record)
      const recordPath = path.join(outputDir, 'generated.json')
      logger.trace(
        {
          documentId: record.documentId,
          path: recordPath,
          filename: record.filename,
          contentType: record.contentType,
        },
        'Writing generated document file',
      )
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new GeneratedDocumentRecordWriteFailed(err)
    }
  }

  return async function (input: GenerateDocument): Promise<DocumentGenerated> {
    const outputDir = await prepareOutputDirectory(input.documentId)
    const generatedPath = await writeGeneratedDocumentFile(outputDir, input)
    return writeGeneratedDocumentRecord(outputDir, generatedPath, input)
  }
}
