import path from 'node:path'

export type RecordType = 'created' | 'paid' | 'generated'

/**
 * The shared directory holding every document's record of a given type
 * (`<dataRoot>/<recordType>/`).
 */
export function recordDir(dataRoot: string, recordType: RecordType): string {
  return path.join(dataRoot, recordType)
}

/**
 * The path to one document's record of a given type
 * (`<dataRoot>/<recordType>/<documentId>.<extension>`). Defaults to a
 * `.json` extension; `generateDocument`'s content file is the one caller
 * that passes `'txt'`.
 */
export function buildRecordPath(
  dataRoot: string,
  recordType: RecordType,
  documentId: string,
  extension = 'json',
): string {
  return path.join(
    recordDir(dataRoot, recordType),
    `${documentId}.${extension}`,
  )
}
