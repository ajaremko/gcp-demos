import styled from 'styled-components'

import { Card, Heading, Subheading, HelperText } from '@/lib/ui'

const List = styled.ul`
  margin: 0;
  padding-left: 1rem;
  padding-bottom: 1rem;
  font-size: 0.85rem;
`

export function WhatYouGetPanel() {
  return (
    <Card>
      <Heading as="h2" style={{ fontSize: '1.25rem' }}>
        What you get
      </Heading>
      <Subheading>One flat price, no subscription.</Subheading>
      <List>
        <li>A custom-generated document from your title and content</li>
        <li>Secure checkout via Stripe</li>
        <li>Instant download once it&apos;s ready</li>
      </List>
      <HelperText>$9.99 one-time — charged on the next step.</HelperText>
    </Card>
  )
}
