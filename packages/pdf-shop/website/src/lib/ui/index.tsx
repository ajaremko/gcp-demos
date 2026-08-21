'use client'
import Link from 'next/link'
import styled, { css } from 'styled-components'

export const PageShell = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${(props) => props.theme.spacing(8)}
    ${(props) => props.theme.spacing(3)};
`

export const Card = styled.div`
  width: 100%;
  max-width: 560px;
  background: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing(5)};
  box-shadow:
    0 1px 2px rgba(16, 24, 40, 0.04),
    0 8px 24px rgba(16, 24, 40, 0.06);
`

export const Heading = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 ${(props) => props.theme.spacing(1)};
`

export const Subheading = styled.p`
  color: ${(props) => props.theme.colors.textMuted};
  margin: 0 0 ${(props) => props.theme.spacing(4)};
`

export const SubheadingSpan = styled.span`
  color: ${(props) => props.theme.colors.textMuted};
  margin: 0 0 ${(props) => props.theme.spacing(4)};
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing(1)};
  margin-bottom: ${(props) => props.theme.spacing(3)};
`

export const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
`

const inputStyles = `
  background: white;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  color: inherit;
`

export const Input = styled.input`
  ${inputStyles}
  border: 1px solid ${(props) => props.theme.colors.border};

  &:focus {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 1px;
  }
`

export const TextArea = styled.textarea`
  ${inputStyles}
  border: 1px solid ${(props) => props.theme.colors.border};
  min-height: 160px;
  resize: vertical;

  &:focus {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 1px;
  }
`

export const Select = styled.select`
  ${inputStyles}
  border: 1px solid ${(props) => props.theme.colors.border};
`

export const HelperText = styled.span`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.textMuted};
`

export const ErrorText = styled.span`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.danger};
`

const buttonStyles = css`
  background: ${(props) => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${(props) => props.theme.radii.pill};
  padding: 12px 24px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.colors.primaryHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const Button = styled.button`
  ${buttonStyles}
`

export const LinkButton = styled.a`
  ${buttonStyles}
`

// styled(Link) is composed here, inside a client module, rather than
// passed in as an `as` prop from a Server Component — a component
// reference can't cross the server/client boundary as a prop value.
export const NavLinkButton = styled(Link)`
  ${buttonStyles}
`
