// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

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

interface FieldError {
  field: string;
  code: string;
  message: string;
}

/**
 * Map a `422` `{ errors: [{ field, code, message }] }` payload to a
 * `{ fieldName: message }` record, for surfacing per-field errors on a form.
 * Returns an empty object for any other error shape.
 */
export function extractApiFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (error && typeof error === "object") {
    const errors = (error as { errors?: unknown }).errors;
    if (Array.isArray(errors)) {
      for (const item of errors as FieldError[]) {
        if (item?.field && item?.message && !(item.field in result)) {
          result[item.field] = item.message;
        }
      }
    }
  }
  return result;
}
