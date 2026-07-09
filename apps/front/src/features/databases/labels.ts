import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const DATABASE_STATUS_LABELS: Record<
  S["DatabaseStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const DATABASE_STATUS_DESCRIPTIONS: Record<
  S["DatabaseStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de préparation, non encore publiée.`,
  active: msg`En service et visible par les membres du compte.`,
  archived: msg`Conservée pour l'historique, sans modification possible.`,
};

export const DATABASE_STATUS_COLORS: Record<S["DatabaseStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const DATABASE_TYPE_LABELS: Record<
  S["DatabaseType"],
  MessageDescriptor
> = {
  mysql: msg`MySQL`,
  postgresql: msg`PostgreSQL`,
};

export const DATABASE_TYPE_DESCRIPTIONS: Record<
  S["DatabaseType"],
  MessageDescriptor
> = {
  mysql: msg`Moteur MySQL ou MariaDB.`,
  postgresql: msg`Moteur PostgreSQL.`,
};

export const DATABASE_TYPE_COLORS: Record<S["DatabaseType"], string> = {
  mysql: "orange",
  postgresql: "blue",
};

export const TABLE_STATUS_LABELS: Record<
  S["DatabaseTableStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const TABLE_STATUS_DESCRIPTIONS: Record<
  S["DatabaseTableStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de préparation, non encore publiée.`,
  active: msg`En service et visible par les membres du compte.`,
  archived: msg`Conservée pour l'historique, sans modification possible.`,
};

export const TABLE_STATUS_COLORS: Record<S["DatabaseTableStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const TABLE_TYPE_LABELS: Record<
  S["DatabaseTableType"],
  MessageDescriptor
> = {
  physical: msg`Physique`,
  logical: msg`Logique`,
};

export const TABLE_TYPE_DESCRIPTIONS: Record<
  S["DatabaseTableType"],
  MessageDescriptor
> = {
  physical: msg`Table réellement créée dans le moteur.`,
  logical: msg`Vue ou regroupement conceptuel, sans existence physique.`,
};

export const TABLE_TYPE_COLORS: Record<S["DatabaseTableType"], string> = {
  physical: "geekblue",
  logical: "purple",
};

export const VERSION_STATUS_LABELS: Record<
  S["DatabaseVersionStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const VERSION_STATUS_DESCRIPTIONS: Record<
  S["DatabaseVersionStatus"],
  MessageDescriptor
> = {
  draft: msg`Schéma en cours de conception, non encore déployé.`,
  active: msg`Schéma actuellement en production.`,
  archived: msg`Schéma d'une version passée, conservé pour l'historique.`,
};

export const VERSION_STATUS_COLORS: Record<S["DatabaseVersionStatus"], string> =
  {
    draft: "default",
    active: "success",
    archived: "warning",
  };

/** A dotted list of non-negative integers: `1`, `1.2`, `1.2.0`. */
const VERSION_PATTERN = /^\d+(\.\d+)*$/;
const LEADING_V = /^v/i;

/** `[1, 2, 0]` → `v1.2.0`. */
export function formatVersion(version: number[]): string {
  return `v${version.join(".")}`;
}

/**
 * Newest first, comparing segment by segment — so `v1.10.0` sorts above
 * `v1.9.0`, which a lexicographic sort on the formatted string would not.
 * A missing segment counts as `0`: `v2` and `v2.0.0` are the same version.
 */
export function compareVersionsDesc(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    const diff = (b[index] ?? 0) - (a[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * `"1.2.0"` → `[1, 2, 0]`, or `null` when the input is not a dotted list of
 * non-negative integers. A leading `v` is tolerated, since that is how the
 * version is rendered everywhere else.
 */
export function parseVersion(input: string): number[] | null {
  const trimmed = input.trim().replace(LEADING_V, "");
  if (!VERSION_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed.split(".").map(Number);
}
