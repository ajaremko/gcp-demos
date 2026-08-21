import {
  siNextdotjs,
  siReact,
  siTypescript,
  siStyledcomponents,
  siTanstack,
  siStripe,
  siZod,
  siNodedotjs,
  siExpress,
  siPino,
  siNx,
  siDocker,
  siPulumi,
  siGooglecloud,
} from 'simple-icons'
import styled from 'styled-components'

import { Card, Heading, Subheading, HelperText } from '@/lib/ui'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: ${(props) => props.theme.spacing(3)};
  margin-top: ${(props) => props.theme.spacing(3)};
`

const Chip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(props) => props.theme.spacing(1)};
  text-align: center;
`

const STACK = [
  { name: 'Next.js', icon: siNextdotjs },
  { name: 'React', icon: siReact },
  { name: 'TypeScript', icon: siTypescript },
  { name: 'styled-components', icon: siStyledcomponents },
  { name: 'TanStack Query', icon: siTanstack },
  { name: 'Stripe', icon: siStripe },
  { name: 'Zod', icon: siZod },
  { name: 'Node.js', icon: siNodedotjs },
  { name: 'Express', icon: siExpress },
  { name: 'Pino', icon: siPino },
  { name: 'Nx', icon: siNx },
  { name: 'Docker', icon: siDocker },
  { name: 'Pulumi', icon: siPulumi },
  { name: 'Google Cloud', icon: siGooglecloud },
] as const

export function TechStack() {
  return (
    <Card style={{ maxWidth: '1000px' }}>
      <Heading as="h2" style={{ fontSize: '1.5rem' }}>
        Built with
      </Heading>
      <Subheading>The stack behind this demo, end to end.</Subheading>
      <Grid>
        {STACK.map(({ name, icon }) => (
          <Chip key={name}>
            <svg
              viewBox="0 0 24 24"
              width="32"
              height="32"
              fill={`#${icon.hex}`}
            >
              <title>{icon.title}</title>
              <path d={icon.path} />
            </svg>
            <HelperText>{name}</HelperText>
          </Chip>
        ))}
      </Grid>
    </Card>
  )
}
