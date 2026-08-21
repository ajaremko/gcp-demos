import { Card, Heading, Subheading } from '@/lib/ui'

import { CreateDocumentSpecForm } from './CreateDocumentForm'

export function OrderDocumentPanel() {
  return (
    <Card>
      <Heading>Customize your document</Heading>
      <Subheading>
        We&apos;ll use this specification to generate your custom document.
      </Subheading>
      <CreateDocumentSpecForm />
    </Card>
  )
}
