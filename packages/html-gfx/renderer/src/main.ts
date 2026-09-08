import express from 'express'
import * as fs from 'fs'

import { makeRenderer, RendererNotReady, RenderingFailed } from './renderer'

const outputDir = process.env.OUTPUT_DIR
if (!outputDir) {
  throw new Error('OUTPUT_DIR environment variable is not set')
}

const maxPages = process.env.MAX_PAGES
  ? parseInt(process.env.MAX_PAGES, 10)
  : undefined
if (!maxPages) {
  throw new Error('MAX_PAGES environment variable is not set or invalid')
}

fs.mkdirSync(outputDir, { recursive: true })

const app = express()
const renderer = makeRenderer({ outputDir, maxPages })

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
      console.error('Error during rendering:', error)
      res.status(500).send({
        status: 'error',
        message: 'An unexpected error occurred',
      })
    }
  }
})

const port = process.env.PORT || 3333
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/`)
  renderer.initialize().then(() => {
    console.log('Renderer initialized')
  })
})

server.on('error', (err) => {
  console.error('Server encountered an error', err)
  renderer.shutdown().then(() => {
    process.exit(1)
  })
})

server.on('close', () => {
  console.log('Server has been closed')
  renderer.shutdown().then(() => {
    process.exit(1)
  })
})
