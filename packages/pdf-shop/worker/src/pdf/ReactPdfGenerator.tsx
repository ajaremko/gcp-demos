import { renderToBuffer } from '@react-pdf/renderer'
import { type PdfGenerator } from '@org/pdf-shop-application'

import { DocumentPdf } from './DocumentPdf'

export function ReactPdfGenerator(): PdfGenerator {
  return {
    generate: (spec) => renderToBuffer(<DocumentPdf {...spec} />),
  }
}
