export interface OrderStatus {
  ready: boolean
  paid: boolean
  generated: boolean
}

export async function fetchOrderStatus(documentId: string): Promise<OrderStatus> {
  const response = await fetch(`/api/documents/${documentId}/status`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Failed to check order status (${response.status})`)
  }
  return response.json()
}
