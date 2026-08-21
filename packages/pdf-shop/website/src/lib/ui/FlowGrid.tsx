'use client'
import styled from 'styled-components'

export const FlowGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing(3)};
  width: 100%;
  max-width: 1000px;
  align-items: flex-start;

  > * {
    flex: 1 1 360px;
  }
`
