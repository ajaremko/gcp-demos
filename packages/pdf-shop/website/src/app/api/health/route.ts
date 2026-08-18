/**
 * GET /api/health
 * Health check endpoint to verify that the service has started.
 * @returns ok
 */
export function GET() {
  return Response.json({ status: 'ok' })
}
