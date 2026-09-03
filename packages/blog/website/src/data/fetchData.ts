import { pinoLogger } from '../logging/pino'

/**
 * Result of fetching data from the admin API. Response may include documents as well as errors.
 */
export interface ApiResponse<A = unknown> {
  docs: A[]
  errors?: Array<{ message: string }>
}

function getAdminApiUrl(): string {
  const url = process.env.ADMIN_API_URL
  if (!url) {
    pinoLogger.fatal(
      'Missing required configuration: ADMIN_API_URL must be set to fetch blog content from the CMS',
    )
    throw new Error(
      'ADMIN_API_URL must be set to fetch blog content from the CMS.',
    )
  }
  return url.replace(/\/+$/, '')
}

/**
 * Fetch data from the admin API at the specified path.
 * Throws an error if the request fails or if the API returns errors.
 */
export function fetchData<A>(logger: typeof pinoLogger) {
  const fetchDataLogger = logger.child({ module: 'data' })

  return async function (path: string): Promise<ApiResponse<A>> {
    const url = getAdminApiUrl()
    fetchDataLogger.trace({ path }, 'Fetching data from API')
    const response = await fetch(`${url}/api${path}`)

    // Handle non 2xx responses from the API
    if (!response.ok) {
      fetchDataLogger.warn(
        { path, status: response.status, statusText: response.statusText },
        'API request failed',
      )
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      )
    }

    // Parse the JSON response and cast as provided type
    const data = (await response.json()) as ApiResponse<A>

    // Handle API errors returned in the response
    if (data.errors?.length) {
      fetchDataLogger.warn({ path, errors: data.errors }, 'API returned errors')
      throw new Error(data.errors.map((e) => e.message).join('; '))
    }

    fetchDataLogger.trace(
      { path, docsCount: data.docs.length },
      'API request succeeded',
    )
    return data
  }
}
