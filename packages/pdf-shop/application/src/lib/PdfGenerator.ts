export interface PdfGenerator {
  generate: (spec: {
    colorScheme: 'light' | 'dark'
    title: string
    body: string
  }) => Promise<Uint8Array>
}
