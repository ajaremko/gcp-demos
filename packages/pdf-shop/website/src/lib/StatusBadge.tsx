'use client'
import styled, { keyframes } from 'styled-components'

const spin = keyframes`to { transform: rotate(360deg); }`

const Badge = styled.span<{ $state: 'processing' | 'ready' }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing(1)};
  padding: 6px 14px;
  border-radius: ${(props) => props.theme.radii.pill};
  font-size: 0.8rem;
  font-weight: 600;
  background: ${(props) => (props.$state === 'ready' ? '#dcfce7' : '#fef3c7')};
  color: ${(props) =>
    props.$state === 'ready' ? props.theme.colors.success : '#92400e'};
`

const Spinner = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: ${spin} 0.7s linear infinite;
`

export function StatusBadge({
  state,
  children,
}: {
  state: 'processing' | 'ready'
  children: React.ReactNode
}) {
  return (
    <Badge $state={state}>
      {state === 'processing' ? <Spinner /> : '✓ '}
      {children}
    </Badge>
  )
}
