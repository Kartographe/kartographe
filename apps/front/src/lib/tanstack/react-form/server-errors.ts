// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { AnyFormApi } from "@tanstack/react-form";
import { extractApiFieldErrors } from "@/api/error-messages";

/**
 * Map a FastAPI `422` `{ errors[] }` payload onto the form's fields so each
 * invalid input shows its message inline. Field names in the payload are
 * camelCase and match the form field names 1:1.
 *
 * Returns true if at least one field error was applied (so the caller can skip
 * a generic toast when the form already shows the problem).
 */
export function handleFormError(form: AnyFormApi, error: unknown): boolean {
  const fieldErrors = extractApiFieldErrors(error);
  const entries = Object.entries(fieldErrors);
  for (const [field, message] of entries) {
    form.setFieldMeta(field, (prev) => ({
      ...prev,
      isTouched: true,
      errorMap: { ...prev.errorMap, onServer: message },
      errors: [message],
    }));
  }
  return entries.length > 0;
}
