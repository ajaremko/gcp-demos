'use client'
import styled from 'styled-components'
import Link from 'next/link'
import { siGithub } from 'simple-icons'

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  padding: ${(props) => props.theme.spacing(2)}
    ${(props) => props.theme.spacing(3)};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`

const Logo = styled(Link)`
  font-weight: 700;
  font-size: 1.1rem;
  color: ${(props) => props.theme.colors.text};
  text-decoration: none;
`

const GithubLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing(1)};
  font-size: 0.9rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textMuted};
  text-decoration: none;

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }
`

export function SiteHeader() {
  return (
    <Bar>
      <Logo href="/">PDF Shop</Logo>
      <GithubLink
        href="https://github.com/ajaremko/gcp-demos/tree/main/packages/pdf-shop"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <title>{siGithub.title}</title>
          <path d={siGithub.path} />
        </svg>
        GitHub
      </GithubLink>
    </Bar>
  )
}
