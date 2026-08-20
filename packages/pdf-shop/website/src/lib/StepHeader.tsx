'use client'
import styled from 'styled-components'
import { StepIndicator, type StepKey } from './StepIndicator'
import { HelperText } from './ui'

const Header = styled.div`
  width: 100%;
  max-width: 560px;
  margin-bottom: ${(props) => props.theme.spacing(4)};
`

export function StepHeader({
  currentStep,
  children,
}: {
  currentStep: StepKey
  children: React.ReactNode
}) {
  return (
    <Header>
      <StepIndicator currentStep={currentStep} />
      <HelperText>{children}</HelperText>
    </Header>
  )
}
