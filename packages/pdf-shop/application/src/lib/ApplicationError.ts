export abstract class ApplicationError extends Error {
  abstract readonly tag: string

  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = this.constructor.name
  }
}

export function isApplicationError(err: unknown): err is ApplicationError {
  return err instanceof ApplicationError
}
