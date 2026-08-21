import { Card, Heading, Subheading, HelperText } from '@/lib/ui'

const steps = [
  {
    label: 'Create',
    title: 'Describe your document',
    description: 'Tell us the title and content you want turned into a document.',
  },
  {
    label: 'Purchase',
    title: 'Pay securely',
    description: "Check out with Stripe — sandbox mode, no real charge.",
  },
  {
    label: 'Download',
    title: 'Get your document',
    description: "Once it's generated, download it instantly.",
  },
] as const

export function HowItWorks() {
  return (
    <Card style={{ maxWidth: '900px' }}>
      <Heading as="h2" style={{ fontSize: '1.5rem' }}>
        How it works
      </Heading>
      <Subheading>Three steps from idea to download.</Subheading>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {steps.map((step, index) => (
          <div key={step.label} style={{ flex: '1 1 240px' }}>
            <HelperText>
              {index + 1}. {step.label}
            </HelperText>
            <Heading as="h3" style={{ fontSize: '1.05rem', margin: '4px 0' }}>
              {step.title}
            </Heading>
            <Subheading style={{ marginBottom: 0, fontSize: '0.9rem' }}>
              {step.description}
            </Subheading>
          </div>
        ))}
      </div>
    </Card>
  )
}
