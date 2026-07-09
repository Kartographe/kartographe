import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";

type DatabaseType = components["schemas"]["DatabaseType"];
type ColumnType = components["schemas"]["DatabaseColumnTypeItem"];

export interface ColumnTypeLookup {
  /** Types offered by this engine, for a form's select. */
  options: { value: string; label: string }[];
  /** `databaseColumnTypeId` → its human label; falls back to the raw id. */
  label: (id: string) => string;
  isLoading: boolean;
}

/**
 * Column types are a global catalogue keyed by engine — a `varchar` of MySQL is
 * not the `varchar` of PostgreSQL. Callers pass the database's own type so the
 * lookup only ever offers what that engine supports.
 */
export function useColumnTypes(databaseType: DatabaseType): ColumnTypeLookup {
  const query = $api.useQuery("get", "/v1/core/databaseColumnTypes", {});
  const all: ColumnType[] = query.data?.items ?? [];
  const forEngine = all.filter((type) => type.databaseType === databaseType);
  const labels = new Map(all.map((type) => [type.id, type.label]));

  return {
    options: forEngine.map((type) => ({ value: type.id, label: type.label })),
    label: (id) => labels.get(id) ?? id,
    isLoading: query.isLoading,
  };
}
