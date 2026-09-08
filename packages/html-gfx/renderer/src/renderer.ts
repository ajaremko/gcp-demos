import puppeteer from 'puppeteer'
import type { Browser, Page, LaunchOptions } from 'puppeteer'
import { randomUUID } from 'crypto'

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
    if (browser === null) {
      browser = await puppeteer.launch(opts.launchOptions)
    }
  }

  async function shutdown() {
    if (browser !== null) {
      await browser.close()
      browser = null
    }
  }

  async function render(htmlString: string) {
    if (browser === null || pages.size >= opts.maxPages) {
      throw new RendererNotReady()
    }
    try {
      const id = randomUUID()
      const path = `${opts.outputDir}/${id}.png`
      const page = await browser.newPage()
      pages.set(id, page)

      await page.setContent(htmlString, {
        waitUntil: 'domcontentloaded',
      })

      await page.screenshot({ path, fullPage: true })

      await page.close()
      pages.delete(id)
      return path
    } catch (error) {
      console.error('Error during rendering:', error)
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
