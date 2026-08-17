import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Logger } from 'pino'

import { ApplicationError } from '../ApplicationError'

import { type GenerationRecord } from './data/GenerationRecord'
import { type DocumentSpec } from './data/DocumentSpec'

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

export class GeneratedDocumentWriteFailed extends ApplicationError {
  readonly tag = 'GeneratedDocumentWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write generated document file', cause)
  }
}

export class GenerationRecordWriteFailed extends ApplicationError {
  readonly tag = 'GenerationRecordWriteFailed'
  constructor(cause: unknown) {
    super('Failed to write generation record', cause)
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

  async function writeDocument(outputDir: string, input: GenerateDocument) {
    try {
      const generatedData = `Generated document for spec ${input.documentId}\n\n${JSON.stringify(input.spec, null, 2)}`
      const generatedPath = path.join(outputDir, `generated.txt`)
      logger.trace(
        {
          documentId: input.documentId,
          path: generatedPath,
        },
        'Writing generated document file',
      )
      await writeFile(generatedPath, generatedData, 'utf-8')
      return generatedPath
    } catch (err) {
      throw new GeneratedDocumentWriteFailed(err)
    }
  }

  async function writeRecord(
    outputDir: string,
    generatedPath: string,
    input: GenerateDocument,
  ) {
    try {
      const record: GenerationRecord = {
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
        'Writing generated document record',
      )
      await writeFile(recordPath, recordData, 'utf-8')

      return record
    } catch (err) {
      throw new GenerationRecordWriteFailed(err)
    }
  }

  return async function (input: GenerateDocument): Promise<GenerationRecord> {
    const outputDir = await prepareOutputDirectory(input.documentId)
    const generatedPath = await writeDocument(outputDir, input)
    return writeRecord(outputDir, generatedPath, input)
  }
}
