import puppeteer from 'puppeteer'
import type { Browser, Page, LaunchOptions } from 'puppeteer'
import { randomUUID } from 'crypto'

import { pinoLogger } from './logging/pino'

const logger = pinoLogger.child({ module: 'renderer' })

export class RendererInitializationFailed {
  readonly tag = 'RendererInitializationFailed'
  readonly message = 'Renderer failed to initialize'
  readonly cause: unknown
  constructor(cause: unknown) {
    this.cause = cause
  }
}

export class RendererNotReady {
  readonly tag = 'RendererNotReady'
  readonly message = 'Renderer is not ready'
}

export class RenderingFailed {
  readonly tag = 'RenderingFailed'
  readonly message = 'Rendering failed'
  readonly cause: unknown
  constructor(cause: unknown) {
    this.cause = cause
  }
}

export function makeRenderer(opts: {
  outputDir: string
  maxPages: number
  launchOptions?: LaunchOptions
}) {
  if (opts.maxPages <= 0) {
    throw new Error('maxPages must be a positive number')
  }

  let browser: Browser | null = null
  const pages: Map<string, Page> = new Map()

  function ready() {
    return browser !== null && pages.size < opts.maxPages
  }

  async function initialize() {
    logger.trace('Initializing renderer')
    if (browser === null) {
      try {
        browser = await puppeteer.launch(opts.launchOptions)
      } catch (error) {
        logger.debug({ err: error }, 'Failed to initialize renderer')
        throw new RendererInitializationFailed(error)
      }
    }
  }

  async function shutdown() {
    if (browser !== null) {
      logger.trace('Shutting down renderer')
      await browser.close()
      browser = null
    }
  }

  async function render(htmlString: string) {
    if (browser === null || pages.size >= opts.maxPages) {
      throw new RendererNotReady()
    }
    const id = randomUUID()
    logger.trace({ id }, 'Starting render request')
    try {
      const path = `${opts.outputDir}/${id}.png`
      const page = await browser.newPage()
      pages.set(id, page)

      await page.setContent(htmlString, {
        waitUntil: 'domcontentloaded',
      })

      await page.screenshot({ path, fullPage: true })
      logger.trace({ id, path }, 'Render request completed successfully')

      await page.close()
      pages.delete(id)
      return path
    } catch (error) {
      logger.debug({ err: error }, 'Error during rendering')
      pages.delete(id)
      throw new RenderingFailed(error)
    }
  }

  return {
    ready,
    render,
    initialize,
    shutdown,
  }
}

export type Renderer = ReturnType<typeof makeRenderer>
