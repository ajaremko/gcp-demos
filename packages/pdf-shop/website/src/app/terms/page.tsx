import { PageShell, Card, Heading, Subheading } from '@/lib/ui'

export default function TermsPage() {
  return (
    <PageShell>
      <Card>
        <Heading>Terms</Heading>
        <Subheading>
          This is a technical demonstration project, not a commercial
          service. No real terms of service apply. Payments are processed
          through Stripe&apos;s sandbox/test mode and are not real charges.
        </Subheading>
      </Card>
    </PageShell>
  )
}
