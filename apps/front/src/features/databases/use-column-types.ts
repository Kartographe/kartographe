// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";

type DatabaseType = components["schemas"]["DatabaseType"];
type ColumnType = components["schemas"]["DatabaseColumnTypeItem"];

export interface ColumnTypeLookup {
  /** Types offered by this engine, for a form's select. */
  options: { value: string; label: string }[];
  /** `databaseColumnTypeId` → its human label; falls back to the raw id. */
  label: (id: string) => string;
  /** Whether the type is a JSON-family type (`json`, `jsonb`, …). */
  isJson: (id: string) => boolean;
  isLoading: boolean;
}

/** A type whose label or slug mentions "json" carries sub-fields. */
function labelIsJson(label: string | undefined): boolean {
  return !!label && label.toLowerCase().includes("json");
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
  const jsonIds = new Set(
    all
      .filter((type) => labelIsJson(type.label) || labelIsJson(type.slug))
      .map((type) => type.id)
  );

  return {
    options: forEngine.map((type) => ({ value: type.id, label: type.label })),
    label: (id) => labels.get(id) ?? id,
    isJson: (id) => jsonIds.has(id),
    isLoading: query.isLoading,
  };
}
