import { PageShell, Card, Heading, Subheading, NavLinkButton } from '@/lib/ui'

export default function LandingPage() {
  return (
    <PageShell>
      <Card>
        <Heading>PDF Shop</Heading>
        <Subheading>
          This is a technical demo. Describe a document, pay for it with a Stripe sandbox
          account, and download the generated PDF once it&apos;s ready.
        </Subheading>
        <NavLinkButton href="/spec">Create a document</NavLinkButton>
      </Card>
    </PageShell>
  )
}
