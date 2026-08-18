import express from 'express'

import { GenerateDocumentHandler } from '@org/pdf-shop-application'

import { pino } from 'pino'

const app = express()

app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

const prettyPrintConfig = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
}

function resolveLogLevel(): string {
  return (
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'info' : 'trace')
  )
}

function resolvePrettyPrintLogs(): boolean {
  const value = process.env.PRETTY_PRINT_LOGS
  if (value === undefined) {
    return process.env.NODE_ENV !== 'production'
  }
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(
    `PRETTY_PRINT_LOGS must be "true" or "false", got: "${value}"`,
  )
}

const pinoLogger = pino({
  level: resolveLogLevel(),
  ...(resolvePrettyPrintLogs() ? prettyPrintConfig : {}),
}).child({
  service: 'pdf-shop-worker',
})

function resolveDataRoot(): string {
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

const dataRoot = resolveDataRoot()

pinoLogger.debug({ dataRoot }, 'Resolved data root for document generation')

const generateDocument = GenerateDocumentHandler({
  dataRoot,
  logger: pinoLogger,
})

app.post('/', async (req, res) => {
  const objectId = req.body?.message?.attributes?.objectId
  const eventType = req.body?.message?.attributes?.eventType

  if (
    eventType !== 'OBJECT_FINALIZE' ||
    typeof objectId !== 'string' ||
    !objectId.endsWith('/created.json')
  ) {
    // Not 422 because we want to avoid retrying the request
    pinoLogger.warn({ objectId, eventType }, 'Unprocessable request received')
    res.status(201).send()
    return
  }

  try {
    await generateDocument({ path: objectId })
    res.status(201).send()
  } catch (err) {
    pinoLogger.error({ err, objectId }, 'Failed to generate document')
    res.status(500).send()
  }
})

const port = process.env.PORT || 3333
const server = app.listen(port, () => {
  pinoLogger.info(`Listening at http://localhost:${port}/api`)
})

server.on('error', (err) => {
  pinoLogger.fatal({ err }, 'Server error')
})
