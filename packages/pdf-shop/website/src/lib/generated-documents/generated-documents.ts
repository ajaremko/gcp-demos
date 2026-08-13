import 'server-only'
import { readFile } from 'node:fs/promises'
import { generatedDocumentStatusFilePath } from './paths'
import { type GeneratedDocumentStatus, generatedDocumentStatusSchema } from './schemas'

// Read-only: this file is written by an out-of-scope external system. Any
// parse failure (missing file, malformed JSON, schema mismatch) is treated
// the same as "not ready yet" rather than an error, since we don't control
// the writer.
export async function getGeneratedDocumentStatus(
  specId: string,
): Promise<GeneratedDocumentStatus | null> {
  try {
    const raw = await readFile(generatedDocumentStatusFilePath(specId), 'utf-8')
    const parsed = generatedDocumentStatusSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn(`generated-documents/${specId}.json failed schema validation`, parsed.error)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}
