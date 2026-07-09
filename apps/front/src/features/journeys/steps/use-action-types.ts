import { $api } from "@/api/$api";

/**
 * The global catalogue of step actions.
 *
 * An action carries a `parameterSchema` — a flat shape hint like
 * `{"selector": "string"}`, not a JSON-Schema document — which drives the
 * parameters editor and which the API validates key-for-key.
 */
export function useActionTypes() {
  const query = $api.useQuery("get", "/v1/core/actionTypes", {});
  const types = query.data?.items ?? [];
  const byId = new Map(types.map((type) => [type.id, type]));

  return {
    isLoading: query.isLoading,
    options: types.map((type) => ({ value: type.id, label: type.label })),
    /** `actionTypeId` → its label, or `null` when the step has no action. */
    label: (id: string | null | undefined) =>
      id ? (byId.get(id)?.label ?? null) : null,
    /** The parameter shape an action expects; `{}` when it takes none. */
    schema: (id: string | null | undefined): Record<string, unknown> =>
      (id ? byId.get(id)?.parameterSchema : undefined) ?? {},
  };
}

/** Same catalogue, for the assertions a step carries. */
export function useAssertionTypes() {
  const query = $api.useQuery("get", "/v1/core/assertionTypes", {});
  const types = query.data?.items ?? [];
  const byId = new Map(types.map((type) => [type.id, type]));

  return {
    isLoading: query.isLoading,
    options: types.map((type) => ({ value: type.id, label: type.label })),
    label: (id: string) => byId.get(id)?.label ?? id,
    schema: (id: string | null | undefined): Record<string, unknown> =>
      (id ? byId.get(id)?.parameterSchema : undefined) ?? {},
  };
}
