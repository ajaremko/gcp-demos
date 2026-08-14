export type DocumentPath = {
  version: 1
  documentId: string
}

export function encodeDocumentPath(path: DocumentPath): string {
  return `v1/documents/${path.documentId}`
}

export function parseDocumentPath(path: string): DocumentPath {
  const parts = path.split('/')
  if (parts.length !== 3 || parts[0] !== 'v1' || parts[1] !== 'documents') {
    throw new Error(`Invalid document path: ${path}`)
  }
  return {
    version: 1,
    documentId: parts[2],
  }
}
