'use client'
import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import styled from 'styled-components'

import {
  Field,
  Label,
  Select,
  Input,
  TextArea,
  ErrorText,
  HelperText,
  Button,
} from '@/lib/ui'

import { createDocumentAction, type CreateDocumentActionState } from './actions'
import { documentSpecSchema, type DocumentSpec } from './documentSpecSchema'

const SubmitButton = styled(Button)`
  width: 100%;
`

const initialState: CreateDocumentActionState = { errors: {} }

export function CreateDocumentSpecForm() {
  const [state, formAction, isPending] = useActionState(
    createDocumentAction,
    initialState,
  )

  const {
    register,
    formState: { errors },
  } = useForm<DocumentSpec>({
    resolver: zodResolver(documentSpecSchema),
    errors: state.errors,
    mode: 'onBlur',
    defaultValues: {
      colorScheme: 'light',
      title: '',
      body: '',
    },
  })

  return (
    <form action={formAction}>
      <Field>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Freelance Services Agreement"
          {...register('title')}
        />
        {errors.title && <ErrorText>{errors.title.message}</ErrorText>}
      </Field>

      <Field>
        <Label htmlFor="body">Body</Label>
        <TextArea
          id="body"
          placeholder="This agreement is made between..."
          {...register('body')}
        />
        <HelperText>The main text of the document.</HelperText>
        {errors.body && <ErrorText>{errors.body.message}</ErrorText>}
      </Field>

      <Field>
        <Label htmlFor="colorScheme">Color scheme</Label>
        <Select id="colorScheme" {...register('colorScheme')}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
        <HelperText>
          Color scheme affects the background and text colors of the generated
          PDF.
        </HelperText>
        {errors.colorScheme && (
          <ErrorText>{errors.colorScheme.message}</ErrorText>
        )}
      </Field>

      {state.message && <ErrorText>{state.message}</ErrorText>}
      <SubmitButton type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Continue to payment'}
      </SubmitButton>
    </form>
  )
}
