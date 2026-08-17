export class UserError extends Error {}

export const errorMessage = (error: unknown) => (
  error instanceof Error ? error.message : String(error)
)
