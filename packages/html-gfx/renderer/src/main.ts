/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express'
import * as path from 'path'
import * as fs from 'fs'

import { makeRenderer } from './renderer'

const OUTPUT_DIR = process.env.OUTPUT_DIR
if (!OUTPUT_DIR) {
  throw new Error('OUTPUT_DIR environment variable is not set')
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const app = express()
const renderer = makeRenderer({ outputDir: OUTPUT_DIR })

app.get('/readyz', (req, res) => {
  if (renderer.ready()) {
    res.send({ status: 'ready' })
  } else {
    res.send({ status: 'not ready' })
  }
})

const port = process.env.PORT || 3333
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`)
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
