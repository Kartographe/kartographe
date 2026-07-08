/**
 * TanStack Form field errors come through as either plain strings or
 * standard-schema issue objects (`{ message }`). Return the first readable one.
 */
export function firstFieldError(errors: unknown[]): string | undefined {
  for (const error of errors) {
    if (typeof error === "string") {
      return error;
    }
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
  }
  return undefined;
}
