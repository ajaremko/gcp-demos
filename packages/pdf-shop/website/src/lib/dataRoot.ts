export function resolveDataRoot(): string {
  if (process.env.PDF_SHOP_DATA_DIR) {
    return process.env.PDF_SHOP_DATA_DIR
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PDF_SHOP_DATA_DIR is not set')
  }
  return '/tmp/pdf-shop-data'
}
