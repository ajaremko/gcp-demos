import express from 'express'
import * as fs from 'fs'

import {
  makeRenderer,
  RendererNotReady,
  RendererOpts,
  RenderingFailed,
} from './renderer'
import { pinoLogger } from './logging/pino'

const outputDir = process.env.OUTPUT_DIR
if (!outputDir) {
  pinoLogger.fatal('OUTPUT_DIR environment variable is not set')
  throw new Error('OUTPUT_DIR environment variable is not set')
}

const maxPages = process.env.MAX_PAGES
  ? parseInt(process.env.MAX_PAGES, 10)
  : undefined
if (!maxPages) {
  pinoLogger.fatal('MAX_PAGES environment variable is not set or invalid')
  throw new Error('MAX_PAGES environment variable is not set or invalid')
}

const puppeteerLaunchConfigPath = process.env.PUPPETEER_LAUNCH_CONFIG
if (!puppeteerLaunchConfigPath) {
  pinoLogger.warn('PUPPETEER_LAUNCH_CONFIG environment variable is not set')
}

try {
  fs.mkdirSync(outputDir, { recursive: true })
} catch (err) {
  pinoLogger.fatal({ err }, 'Failed to create output directory')
  throw err
}

const rendererConfig: RendererOpts = { outputDir, maxPages }

if (puppeteerLaunchConfigPath) {
  try {
    const data = fs.readFileSync(puppeteerLaunchConfigPath, 'utf-8')
    rendererConfig.launchOptions = JSON.parse(data)
  } catch (err) {
    pinoLogger.fatal({ err }, 'Failed to read or parse PUPPETEER_LAUNCH_CONFIG')
    throw err
  }
} else {
  pinoLogger.info('Using default Puppeteer launch configuration')
}

const app = express()
const renderer = makeRenderer(rendererConfig)

app.get('/livez', (req, res) => {
  if (renderer.ready()) {
    res.status(200).send({ status: 'ready' })
  } else {
    res.status(503).send({ status: 'not ready' })
  }
})

app.post('/render', express.text({ type: 'text/html' }), async (req, res) => {
  try {
    const path = await renderer.render(req.body)
    res.status(200).send({ path })
  } catch (error) {
    if (error instanceof RendererNotReady) {
      pinoLogger.warn('Renderer not ready, rejecting render request')
      res.status(503).send({
        status: 'not ready',
        message: 'retry later',
      })
    } else if (error instanceof RenderingFailed) {
      res.status(500).send({
        status: 'rendering failed',
        message: error.message,
      })
    } else {
      pinoLogger.error({ err: error }, 'Unexpected error during render request')
      res.status(500).send({
        status: 'error',
        message: 'An unexpected error occurred',
      })
    }
  }
})

const port = process.env.PORT || 3333
const server = app.listen(port, () => {
  pinoLogger.info(`Listening at http://localhost:${port}/`)
  renderer
    .initialize()
    .then(() => {
      pinoLogger.info('Renderer initialized')
    })
    .catch((err) => {
      pinoLogger.fatal({ err }, 'Failed to initialize renderer')
      process.exit(1)
    })
})

server.on('error', (err) => {
  pinoLogger.fatal({ err }, 'Server encountered an error')
  renderer.shutdown().then(() => {
    process.exit(1)
  })
})

server.on('close', () => {
  pinoLogger.info('Server has been closed')
  renderer.shutdown().then(() => {
    process.exit(0)
  })
})
