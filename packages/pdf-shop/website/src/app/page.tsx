'use client'
import styled from 'styled-components'

import {
  PageShell,
  Heading,
  Subheading,
  HelperText,
  NavLinkButton,
} from '@/lib/ui'
import { HowItWorks } from './HowItWorks'
import { FAQ } from './FAQ'

const Hero = styled.div`
  max-width: 640px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const HeroHeading = styled(Heading)`
  font-size: 2.75rem;
  line-height: 1.15;
  margin-bottom: ${(props) => props.theme.spacing(2)};
`

const HeroSubheading = styled(Subheading)`
  font-size: 1.05rem;
  margin-bottom: ${(props) => props.theme.spacing(2)};
`

const Sections = styled.div`
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing(4)};
  margin-top: ${(props) => props.theme.spacing(6)};
`

export default function LandingPage() {
  return (
    <PageShell>
      <Hero>
        <HeroHeading>Turn your ideas into a polished PDF</HeroHeading>
        <HeroSubheading>
          Describe what you need, pay securely with Stripe, and download your
          generated document in minutes.
        </HeroSubheading>
        <HelperText style={{ marginBottom: '24px' }}>
          $9.99 per document — one-time payment, no subscription.
        </HelperText>
        <NavLinkButton href="/create">Create a document</NavLinkButton>
      </Hero>
      <Sections>
        <HowItWorks />
        <FAQ />
      </Sections>
    </PageShell>
  )
}
