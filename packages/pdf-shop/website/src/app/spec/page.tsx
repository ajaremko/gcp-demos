import { PageShell, Card, Heading, Subheading } from '@/lib/shared/ui'
import { CreateDocumentSpecForm } from '@/lib/document-specs/CreateDocumentSpecForm'

export default function DocumentSpecPage() {
  return (
    <PageShell>
      <Card>
        <Heading>Describe your document</Heading>
        <Subheading>
          We&apos;ll generate a PDF from this once it&apos;s paid for.
        </Subheading>
        <CreateDocumentSpecForm />
      </Card>
    </PageShell>
  )
}
