import { PageShell, Card, Heading, Subheading } from '@/lib/ui'
import { StepIndicator } from '@/lib/StepIndicator'

import { CreateDocumentSpecForm } from './CreateDocumentForm'

export default function DocumentSpecPage() {
  return (
    <PageShell>
      <StepIndicator currentStep="create" />
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
