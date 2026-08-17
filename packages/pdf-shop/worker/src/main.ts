import express from 'express'
import * as path from 'path'

import { GenerateDocumentHandler } from '@org/pdf-shop-application'

import { pino } from 'pino'

const app = express()

app.use(express.json())

app.use('/assets', express.static(path.join(__dirname, 'assets')))

const pinoDevConfig = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
}

const pinoLogger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'trace',
  ...(process.env.NODE_ENV === 'production' ? {} : pinoDevConfig),
})

const generateDocument = GenerateDocumentHandler({
  dataRoot: process.env.DATA_ROOT ?? '',
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
  console.log(`Listening at http://localhost:${port}/api`)
})
server.on('error', console.error)
