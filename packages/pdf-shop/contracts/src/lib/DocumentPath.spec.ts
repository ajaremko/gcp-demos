import { describe, it, expect } from 'vitest'

import {
  encodeDocumentPath,
  parseDocumentPath,
  type DocumentPath,
} from './DocumentPath.js'

describe('encodeDocumentPath', () => {
  it('joins rootDir, documentId, and filename with slashes', () => {
    const path: DocumentPath = {
      version: 1,
      rootDir: 'generated-documents',
      documentId: 'abc-123',
      filename: 'contract.pdf',
    }

    expect(encodeDocumentPath(path)).toBe(
      'generated-documents/abc-123/contract.pdf',
    )
  })
})

describe('parseDocumentPath', () => {
  it('parses a valid 3-segment path', () => {
    expect(parseDocumentPath('generated-documents/abc-123/contract.pdf')).toEqual({
      version: 1,
      rootDir: 'generated-documents',
      documentId: 'abc-123',
      filename: 'contract.pdf',
    })
  })

  it('throws when the path has too few segments', () => {
    expect(() => parseDocumentPath('only-one-part')).toThrow(
      'Invalid document path: only-one-part',
    )
  })

  it('throws when the path has too many segments', () => {
    expect(() => parseDocumentPath('a/b/c/d')).toThrow(
      'Invalid document path: a/b/c/d',
    )
  })

  it('throws on an empty string', () => {
    expect(() => parseDocumentPath('')).toThrow('Invalid document path: ')
  })
})

describe('encodeDocumentPath / parseDocumentPath round trip', () => {
  it('recovers the original path from an encoded string', () => {
    const original: DocumentPath = {
      version: 1,
      rootDir: 'root',
      documentId: 'doc-1',
      filename: 'file.pdf',
    }

    expect(parseDocumentPath(encodeDocumentPath(original))).toEqual(original)
  })
})
