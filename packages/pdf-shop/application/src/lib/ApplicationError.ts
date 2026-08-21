/**
 * Common base class for every error this package's internal functions and
 * handlers throw. Consumers catching a call into this package should narrow
 * with {@link isApplicationError} and then switch on `tag` to determine
 * what specifically went wrong - `tag` is a fixed string literal unique to
 * each concrete subclass (e.g. `PaymentIntentInvalid`, `OrderRecordWriteFailed`),
 * safe to switch on, unlike an `instanceof` chain or parsing the error message.
 * The original underlying error (a Stripe error, a filesystem error, a Zod
 * error, etc.) is preserved on the standard `cause` property for
 * logging/debugging - it isn't meant to be branched on the way `tag` is.
 *
 * @example
 * try {
 *   await PurchaseDocumentHandler(env)(input)
 * } catch (err) {
 *   if (isApplicationError(err)) {
 *     switch (err.tag) {
 *       case 'PaymentIntentNotFound':
 *         // ...
 *         break
 *       case 'PaymentIntentInvalid':
 *         // ...
 *         break
 *       default:
 *       // an ApplicationError this caller doesn't handle specially
 *     }
 *     console.warn({ error: err }) // err.cause carries the original error
 *   }
 * }
 */
export abstract class ApplicationError extends Error {
  /** Discriminant identifying which concrete error occurred; unique per subclass, safe to switch on. */
  abstract readonly tag: string
  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = this.constructor.name
  }
}

/**
 * Narrows an unknown caught value to {@link ApplicationError}, so its `tag`
 * and `cause` can be safely accessed.
 */
export function isApplicationError(err: unknown): err is ApplicationError {
  return err instanceof ApplicationError
}
