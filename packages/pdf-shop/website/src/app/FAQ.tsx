import { Card, Heading, Subheading } from '@/lib/ui'

const faqs = [
  {
    question: 'Is this a real product?',
    answer:
      'No - this is a technical demo showcasing a document-generation and checkout flow, not a commercial service.',
  },
  {
    question: 'Will I really be charged?',
    answer:
      'No. Payments run through Stripe in sandbox/test mode, so no real money changes hands.',
  },
  {
    question: 'What format do I get?',
    answer:
      'Today, generated documents are plain text files, despite the "PDF Shop" name - this demo doesn\'t yet produce actual PDFs.',
  },
] as const

export function FAQ() {
  return (
    <Card style={{ maxWidth: '1000px' }}>
      <Heading as="h2" style={{ fontSize: '1.5rem' }}>
        Frequently asked questions
      </Heading>
      {faqs.map((faq) => (
        <div
          key={faq.question}
          style={{ marginBottom: '1.25rem', marginTop: '1.5rem' }}
        >
          <Heading as="h3" style={{ fontSize: '1rem', margin: '0 0 4px' }}>
            {faq.question}
          </Heading>
          <Subheading style={{ marginBottom: 0, fontSize: '0.9rem' }}>
            {faq.answer}
          </Subheading>
        </div>
      ))}
    </Card>
  )
}
