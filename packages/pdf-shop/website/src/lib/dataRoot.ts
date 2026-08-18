export function resolveDataRoot(): string {
  if (process.env.DATA_ROOT) {
    return process.env.DATA_ROOT
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATA_ROOT is not set')
  }
  return '/tmp/pdf-shop-worker-data'
}
