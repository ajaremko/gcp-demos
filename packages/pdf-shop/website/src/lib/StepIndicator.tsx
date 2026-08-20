'use client'
import styled from 'styled-components'

const steps = [
  { key: 'create', label: 'Create' },
  { key: 'purchase', label: 'Purchase' },
  { key: 'download', label: 'Download' },
] as const

type StepKey = (typeof steps)[number]['key']

const Row = styled.ol`
  display: flex;
  align-items: center;
  list-style: none;
  width: 100%;
  max-width: 560px;
  margin: 0 0 ${(props) => props.theme.spacing(4)} 0;
  padding: 0;
`

const StepItem = styled.li`
  display: flex;
  align-items: center;
  flex: 1;

  &:last-child {
    flex: 0 0 auto;
  }
`

const Connector = styled.span<{ $completed: boolean }>`
  flex: 1;
  height: 2px;
  margin: 0 ${(props) => props.theme.spacing(1)};
  background: ${(props) =>
    props.$completed ? props.theme.colors.success : props.theme.colors.border};
`

const Marker = styled.span<{ $status: 'completed' | 'current' | 'upcoming' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${(props) =>
    props.$status === 'completed'
      ? props.theme.colors.success
      : props.$status === 'current'
        ? props.theme.colors.primary
        : props.theme.colors.surfaceAlt};
  color: ${(props) =>
    props.$status === 'upcoming'
      ? props.theme.colors.textMuted
      : props.theme.colors.background};
  border: ${(props) =>
    props.$status === 'upcoming' ? `1px solid ${props.theme.colors.border}` : 'none'};
`

const StepLabel = styled.span<{ $current: boolean }>`
  margin-left: ${(props) => props.theme.spacing(1)};
  font-size: 0.85rem;
  font-weight: ${(props) => (props.$current ? 600 : 400)};
  color: ${(props) =>
    props.$current ? props.theme.colors.text : props.theme.colors.textMuted};
  white-space: nowrap;
`

export function StepIndicator({ currentStep }: { currentStep: StepKey }) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep)

  return (
    <Row aria-label="Progress">
      {steps.map((step, index) => {
        const status =
          index < currentIndex
            ? 'completed'
            : index === currentIndex
              ? 'current'
              : 'upcoming'
        return (
          <StepItem key={step.key}>
            <Marker
              $status={status}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              {status === 'completed' ? '✓' : index + 1}
            </Marker>
            <StepLabel $current={status === 'current'}>{step.label}</StepLabel>
            {index < steps.length - 1 && (
              <Connector $completed={index < currentIndex} />
            )}
          </StepItem>
        )
      })}
    </Row>
  )
}
