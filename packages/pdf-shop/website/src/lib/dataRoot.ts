import { pinoLogger } from './pino'

export function resolveDataRoot(): string {
  if (process.env.PDF_SHOP_DATA_DIR) {
    return process.env.PDF_SHOP_DATA_DIR
  }
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('PDF_SHOP_DATA_DIR is not set')
    pinoLogger.fatal({ err }, 'Missing required configuration')
    throw err
  }
  return '/tmp/pdf-shop-data'
}
