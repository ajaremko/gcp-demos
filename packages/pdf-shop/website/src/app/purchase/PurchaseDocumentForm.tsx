'use client'
import {
  useState,
  useActionState,
  startTransition,
  type FormEvent,
} from 'react'
import styled from 'styled-components'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

import { Button, ErrorText } from '@/lib/ui'

import {
  purchaseDocumentAction,
  type PurchaseDocumentActionState,
} from './actions'

const Stack = styled.div`
  margin-bottom: ${(props) => props.theme.spacing(3)};
`

let stripePromise: Promise<Stripe | null> | undefined

function getStripe(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

const initialState: PurchaseDocumentActionState = { errors: {} }

export function PurchaseDocumentForm({
  documentId,
  clientSecret,
  publishableKey,
}: {
  documentId: string
  clientSecret: string
  publishableKey: string
}) {
  return (
    <Elements stripe={getStripe(publishableKey)} options={{ clientSecret }}>
      <PurchaseDocumentFormInner documentId={documentId} />
    </Elements>
  )
}

function PurchaseDocumentFormInner({ documentId }: { documentId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  // Stripe error state
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Stripe payment state
  const [paymentPending, setPaymentPending] = useState(false)
  // Server action state
  const [actionState, dispatchAction, isActionPending] = useActionState(
    purchaseDocumentAction,
    initialState,
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return

    setSubmitError(null)
    setPaymentPending(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      setSubmitError(error.message ?? 'Payment failed. Please try again.')
      setPaymentPending(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      // dispatchConfirm's underlying action is async and this call happens
      // after an `await` (stripe.confirmPayment), so React has lost the
      // implicit transition context it gets inside a synchronous event
      // handler — it must be wrapped in startTransition explicitly, or
      // isPending/error state won't update correctly.
      startTransition(() => {
        dispatchAction({ documentId, paymentIntentId: paymentIntent.id })
      })
    } else {
      setSubmitError('Payment was not completed.')
      setPaymentPending(false)
    }
  }

  const pending = paymentPending || isActionPending

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <PaymentElement />
      </Stack>
      {submitError && (
        <Stack>
          <ErrorText>{submitError}</ErrorText>
        </Stack>
      )}
      {actionState.message && (
        <Stack>
          <ErrorText>{actionState.message}</ErrorText>
        </Stack>
      )}
      <Button type="submit" disabled={!stripe || pending}>
        {pending ? 'Processing…' : 'Pay $9.99'}
      </Button>
    </form>
  )
}
