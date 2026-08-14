'use client'
import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createDocumentSpecSchema,
  type CreateDocument,
} from '@org/pdf-shop-contracts'
import {
  Field,
  Label,
  Select,
  Input,
  TextArea,
  ErrorText,
  HelperText,
  Button,
} from '@/lib/shared/ui'
import { submitDocumentSpecAction, type SpecActionState } from './actions'

const initialState: SpecActionState = { errors: {} }

export function CreateDocumentSpecForm() {
  const [state, formAction, isPending] = useActionState(
    submitDocumentSpecAction,
    initialState,
  )

  const {
    register,
    formState: { errors },
  } = useForm<CreateDocument>({
    resolver: zodResolver(createDocumentSpecSchema),
    errors: state.errors,
    mode: 'onBlur',
    defaultValues: {
      colorScheme: 'light',
      title: '',
      body: '',
    },
  })

  console.log('state', state)

  return (
    <form action={formAction}>
      <Field>
        <Label htmlFor="colorScheme">Color scheme</Label>
        <Select id="colorScheme" {...register('colorScheme')}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
        <HelperText>
          Used to style the generated document, not this site.
        </HelperText>
        {errors.colorScheme && (
          <ErrorText>{errors.colorScheme.message}</ErrorText>
        )}
      </Field>

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
      {state.message && <ErrorText>{state.message}</ErrorText>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Continue to payment'}
      </Button>
    </form>
  )
}
