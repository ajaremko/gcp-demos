'use client'
import styled from 'styled-components'

const Wrapper = styled.span`
  position: relative;
  display: inline-block;
`

const Trigger = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: ${(props) => props.theme.colors.primary};
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  cursor: pointer;
`

const Popup = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 20;
  margin-bottom: ${(props) => props.theme.spacing(1)};
  min-width: 280px;
  background: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  padding: ${(props) => props.theme.spacing(2)};
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  pointer-events: none;

  ${Wrapper}:hover &,
  ${Wrapper}:focus-within & {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }
`

export function HoverPopup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Wrapper>
      <Trigger type="button">{label}</Trigger>
      <Popup role="tooltip">{children}</Popup>
    </Wrapper>
  )
}
