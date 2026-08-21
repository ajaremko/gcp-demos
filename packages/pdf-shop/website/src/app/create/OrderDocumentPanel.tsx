'use client'
import { useActionState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import styled from 'styled-components'

import { Card, Heading, Subheading } from '@/lib/ui'

import { createDocumentAction, type CreateDocumentActionState } from './actions'
import { documentSpecSchema, type DocumentSpec } from './documentSpecSchema'
import { randomTitle, randomBody, randomColorScheme } from './sampleData'
import { CreateDocumentSpecForm } from './CreateDocumentForm'

const RandomizeButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  text-align: left;
  color: ${(props) => props.theme.colors.primary};
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  cursor: pointer;
`

const initialState: CreateDocumentActionState = { errors: {} }

export function OrderDocumentPanel() {
  const [state, formAction, isPending] = useActionState(
    createDocumentAction,
    initialState,
  )

  const methods = useForm<DocumentSpec>({
    resolver: zodResolver(documentSpecSchema),
    errors: state.errors,
    mode: 'onBlur',
    defaultValues: {
      colorScheme: 'light',
      title: '',
      body: '',
    },
  })

  function handleRandomize() {
    methods.setValue('title', randomTitle(), {
      shouldValidate: true,
      shouldDirty: true,
    })
    methods.setValue('body', randomBody(), {
      shouldValidate: true,
      shouldDirty: true,
    })
    methods.setValue('colorScheme', randomColorScheme(), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  return (
    <Card>
      <Heading>Customize your document</Heading>
      <Subheading>
        We&apos;ll use this specification to generate your custom
        document.&nbsp;
        <RandomizeButton type="button" onClick={handleRandomize}>
          Click here to fill with random values.
        </RandomizeButton>
      </Subheading>
      <FormProvider {...methods}>
        <CreateDocumentSpecForm
          formAction={formAction}
          isPending={isPending}
          message={state.message}
        />
      </FormProvider>
    </Card>
  )
}
