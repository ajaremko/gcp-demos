export class StripeIntegrationFailed {
  readonly tag = 'StripeIntegrationFailed'
  constructor(
    readonly message: string,
    readonly cause: unknown,
  ) {}
}

export class FileIOFailed {
  readonly tag = 'FileIOFailed'
  constructor(
    readonly message: string,
    readonly cause: unknown,
  ) {}
}
