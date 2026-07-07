const DEFAULT_ERROR = "Une erreur est survenue. Veuillez réessayer.";

/**
 * Pull a human-readable message out of whatever an API/mutation error turns
 * out to be — the `{ detail }` envelope the API returns, a plain `Error`, or
 * an unknown throw.
 */
export function extractApiErrorDetail(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return DEFAULT_ERROR;
}
