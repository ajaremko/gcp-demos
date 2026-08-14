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
import { Button, ErrorText } from '@/lib/shared/ui'
import { confirmPaymentAction, type ConfirmPaymentState } from './actions'

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

const initialConfirmState: ConfirmPaymentState = { errors: {} }

export function PaymentForm({
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
      <PaymentFormInner documentId={documentId} />
    </Elements>
  )
}

function PaymentFormInner({ documentId }: { documentId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmState, dispatchConfirm, isConfirmPending] = useActionState(
    confirmPaymentAction,
    initialConfirmState,
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return

    setSubmitError(null)
    setIsConfirming(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      setSubmitError(error.message ?? 'Payment failed. Please try again.')
      setIsConfirming(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      // dispatchConfirm's underlying action is async and this call happens
      // after an `await` (stripe.confirmPayment), so React has lost the
      // implicit transition context it gets inside a synchronous event
      // handler — it must be wrapped in startTransition explicitly, or
      // isPending/error state won't update correctly.
      startTransition(() => {
        dispatchConfirm({ documentId, paymentIntentId: paymentIntent.id })
      })
    } else {
      setSubmitError('Payment was not completed.')
      setIsConfirming(false)
    }
  }

  const pending = isConfirming || isConfirmPending

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
      {confirmState.message && (
        <Stack>
          <ErrorText>{confirmState.message}</ErrorText>
        </Stack>
      )}
      <Button type="submit" disabled={!stripe || pending}>
        {pending ? 'Processing…' : 'Pay $9.99'}
      </Button>
    </form>
  )
}
