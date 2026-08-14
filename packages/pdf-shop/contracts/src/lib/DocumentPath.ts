export type DocumentPath = {
  version: 1
  rootDir: string
  documentId: string
  filename: string
}

export function encodeDocumentPath(path: DocumentPath): string {
  return `${path.rootDir}/${path.documentId}/${path.filename}`
}

export function parseDocumentPath(path: string): DocumentPath {
  const parts = path.split('/')
  if (parts.length !== 3) {
    throw new Error(`Invalid document path: ${path}`)
  }
  return {
    version: 1,
    rootDir: parts[0],
    documentId: parts[1],
    filename: parts[2],
  }
}
