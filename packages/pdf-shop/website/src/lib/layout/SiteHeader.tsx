'use client'
import styled from 'styled-components'
import Link from 'next/link'

const Bar = styled.header`
  width: 100%;
  padding: ${(props) => props.theme.spacing(2)} ${(props) => props.theme.spacing(3)};
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`

const Logo = styled(Link)`
  font-weight: 700;
  font-size: 1.1rem;
  color: ${(props) => props.theme.colors.text};
  text-decoration: none;
`

export function SiteHeader() {
  return (
    <Bar>
      <Logo href="/">PDF Shop</Logo>
    </Bar>
  )
}
