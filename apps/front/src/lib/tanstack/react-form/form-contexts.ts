// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFormHookContexts } from "@tanstack/react-form";

/**
 * Shared field/form contexts for the app's TanStack Form harness. Field and
 * form components read from these; `use-app-form.ts` binds them together into
 * `useAppForm`.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
