'use client'
import styled from 'styled-components'
import Link from 'next/link'

const Bar = styled.footer`
  width: 100%;
  padding: ${(props) => props.theme.spacing(3)};
  display: flex;
  justify-content: center;
  gap: ${(props) => props.theme.spacing(3)};
  border-top: 1px solid ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.textMuted};
  font-size: 0.85rem;
`

export function SiteFooter() {
  return (
    <Bar>
      <span>PDF Shop - sample application</span>
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
    </Bar>
  )
}
