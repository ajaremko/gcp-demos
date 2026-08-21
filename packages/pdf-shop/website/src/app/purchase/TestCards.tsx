'use client'
import styled from 'styled-components'
import { HelperText } from '@/lib/ui'
import { HoverPopup } from '@/lib/HoverPopup'

const List = styled.ul`
  margin: 0;
  padding-left: 1.25rem;
  padding-top: 0.75rem;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  width: 420px;
`

const TEST_CARDS = [
  { number: '4242 4242 4242 4242', description: 'Succeeds' },
  { number: '4000 0000 0000 9995', description: 'Declined' },
  {
    number: '4000 0025 0000 3155',
    description: 'Requires authentication (3DS)',
  },
]

export function TestCards() {
  return (
    <HoverPopup label="Show testing card numbers.">
      <HelperText>
        Use any of these test cards, any future expiry, any 3-digit CVC, any
        ZIP.
      </HelperText>
      <List>
        {TEST_CARDS.map((card) => (
          <li key={card.number}>
            {card.number} — {card.description}
          </li>
        ))}
      </List>
    </HoverPopup>
  )
}
