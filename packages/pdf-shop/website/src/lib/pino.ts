import { pino } from 'pino'

import { resolveLogLevel } from './logLevel'

const devConfig = {
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
  ...(process.env.NODE_ENV === 'production' ? {} : devConfig),
})
