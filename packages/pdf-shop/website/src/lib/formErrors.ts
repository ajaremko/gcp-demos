import { type ZodError } from 'zod'
import { type FieldErrors } from 'react-hook-form'

export function zodFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!fieldErrors[key]) {
      fieldErrors[key] = { type: issue.code, message: issue.message }
    }
  }
  return fieldErrors
}
