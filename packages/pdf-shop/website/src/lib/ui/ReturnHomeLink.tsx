'use client'
import styled from 'styled-components'
import Link from 'next/link'

const StyledLink = styled(Link)`
  display: inline-block;
  margin-top: ${(props) => props.theme.spacing(2)};
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.textMuted};
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }
`

export function ReturnHomeLink() {
  return <StyledLink href="/">Return home</StyledLink>
}
