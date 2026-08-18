import { pino } from 'pino'

import { resolveLogLevel } from './logLevel'
import { resolvePrettyPrintLogs } from './prettyPrintLogs'

const prettyPrintConfig = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true, // Colorize log levels and messages
      translateTime: 'SYS:standard', // Human-readable timestamps
      ignore: 'pid,hostname', // Hide process ID and host
    },
  },
}

export const pinoLogger = pino({
  level: resolveLogLevel(),
  ...(resolvePrettyPrintLogs() ? prettyPrintConfig : {}),
})
