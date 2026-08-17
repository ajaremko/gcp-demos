export type DocumentPath = {
  version: 1
  documentId: string
}

export function encodeDocumentPath(path: DocumentPath): string {
  return `v1/documents/${path.documentId}`
}
