import { PageShell, Card, Heading, Subheading } from '@/lib/ui'

export default function PrivacyPage() {
  return (
    <PageShell>
      <Card>
        <Heading>Privacy</Heading>
        <Subheading>
          This is a technical demonstration project, not a commercial
          service. No real privacy policy applies. Data you enter is used
          only to run this demo and is not sold or shared with third
          parties.
        </Subheading>
      </Card>
    </PageShell>
  )
}
