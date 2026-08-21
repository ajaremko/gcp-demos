import { Card, Heading, SubheadingSpan } from '@/lib/ui'
import styled from 'styled-components'

import { PurchaseDocumentForm } from './PurchaseDocumentForm'
import { TestCards } from './TestCards'

const Subheading = styled(SubheadingSpan)`
  display: block;
  margin-bottom: 1.25rem;
`

export function StripePaymentPanel({
  title,
  documentId,
  clientSecret,
  publishableKey,
}: {
  title: string
  documentId: string
  clientSecret: string | null
  publishableKey: string
}) {
  return (
    <Card>
      <Heading>Pay for &quot;{title}&quot;</Heading>
      <Subheading>
        One-time purchase — sandbox mode, no real charge. Use one of the payment
        methods below.&nbsp;
        <TestCards />
      </Subheading>
      {clientSecret && (
        <PurchaseDocumentForm
          documentId={documentId}
          clientSecret={clientSecret}
          publishableKey={publishableKey}
        />
      )}
    </Card>
  )
}
