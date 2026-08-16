import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { pino, type Logger } from 'pino'
import { vi } from 'vitest'
import { type Stripe } from 'stripe'

export async function createTempDataRoot(): Promise<{
  dataRoot: string
  cleanup: () => Promise<void>
}> {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'pdf-shop-app-'))
  return {
    dataRoot,
    cleanup: () => rm(dataRoot, { recursive: true, force: true }),
  }
}

export function createTestLogger(): Logger {
  return pino({ level: 'silent' })
}

export function createFakeStripe() {
  return {
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  } as unknown as Stripe
}
