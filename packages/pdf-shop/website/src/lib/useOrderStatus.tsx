'use client'
import { useQuery } from '@tanstack/react-query'

const POLL_INTERVAL_MS = 3000

export interface OrderStatus {
  ready: boolean
  paid: boolean
  generated: boolean
}

async function fetchOrderStatus(documentId: string): Promise<OrderStatus> {
  const response = await fetch(`/api/documents/${documentId}/status`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Failed to check order status (${response.status})`)
  }
  return response.json()
}

export function useOrderStatus(documentId: string, initialData?: OrderStatus) {
  return useQuery({
    queryKey: ['order-status', documentId],
    queryFn: () => fetchOrderStatus(documentId),
    initialData,
    refetchInterval: (query) =>
      query.state.data?.generated ? false : POLL_INTERVAL_MS,
  })
}
