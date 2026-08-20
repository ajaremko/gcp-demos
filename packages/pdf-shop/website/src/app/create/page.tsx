import { PageShell, Card, Heading, Subheading } from '@/lib/ui'
import { StepHeader } from '@/lib/StepHeader'

import { CreateDocumentSpecForm } from './CreateDocumentForm'

export default function DocumentSpecPage() {
  return (
    <PageShell>
      <StepHeader currentStep="create">
        Describe the document you&apos;d like, then continue to payment.
      </StepHeader>
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
