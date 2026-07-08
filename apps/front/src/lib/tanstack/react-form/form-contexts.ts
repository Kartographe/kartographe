import { createFormHookContexts } from "@tanstack/react-form";

/**
 * Shared field/form contexts for the app's TanStack Form harness. Field and
 * form components read from these; `use-app-form.ts` binds them together into
 * `useAppForm`.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
