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

export const MIGRATION_TYPE_LABELS: Record<
  S["DatabaseMigrationType"],
  MessageDescriptor
> = {
  minor: msg`Mineure`,
  major: msg`Majeure`,
};

export const MIGRATION_TYPE_DESCRIPTIONS: Record<
  S["DatabaseMigrationType"],
  MessageDescriptor
> = {
  minor: msg`Changement rétrocompatible : les consommateurs existants continuent de fonctionner.`,
  major: msg`Changement de rupture : les consommateurs doivent être adaptés.`,
};

export const MIGRATION_TYPE_COLORS: Record<S["DatabaseMigrationType"], string> =
  {
    minor: "blue",
    major: "volcano",
  };

export const MIGRATION_STATUS_LABELS: Record<
  S["DatabaseMigrationStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  validated: msg`Validée`,
  completed: msg`Terminée`,
  cancelled: msg`Annulée`,
};

export const MIGRATION_STATUS_DESCRIPTIONS: Record<
  S["DatabaseMigrationStatus"],
  MessageDescriptor
> = {
  draft: msg`Plan en cours d'écriture, non encore approuvé.`,
  validated: msg`Plan approuvé, prêt à être exécuté.`,
  completed: msg`Migration exécutée jusqu'au bout.`,
  cancelled: msg`Migration abandonnée, conservée pour l'historique.`,
};

export const MIGRATION_STATUS_COLORS: Record<
  S["DatabaseMigrationStatus"],
  string
> = {
  draft: "default",
  validated: "processing",
  completed: "success",
  cancelled: "error",
};

export const MIGRATION_COLUMN_TYPE_LABELS: Record<
  S["DatabaseMigrationColumnType"],
  MessageDescriptor
> = {
  migration: msg`Migration`,
  deletion: msg`Suppression`,
  creation: msg`Création`,
};

export const MIGRATION_COLUMN_TYPE_DESCRIPTIONS: Record<
  S["DatabaseMigrationColumnType"],
  MessageDescriptor
> = {
  migration: msg`La donnée est reprise de la colonne source vers la colonne de destination.`,
  deletion: msg`La colonne source disparaît et n'est reprise nulle part.`,
  creation: msg`La colonne de destination est nouvelle, sans source à reprendre.`,
};

export const MIGRATION_COLUMN_TYPE_COLORS: Record<
  S["DatabaseMigrationColumnType"],
  string
> = {
  migration: "geekblue",
  deletion: "red",
  creation: "green",
};

export const MIGRATION_COLUMN_STATUS_LABELS: Record<
  S["DatabaseMigrationColumnStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  to_be_confirmed: msg`À confirmer`,
  confirmed: msg`Confirmée`,
};

export const MIGRATION_COLUMN_STATUS_DESCRIPTIONS: Record<
  S["DatabaseMigrationColumnStatus"],
  MessageDescriptor
> = {
  draft: msg`Étape en cours d'écriture.`,
  to_be_confirmed: msg`Étape soumise à relecture, en attente de confirmation.`,
  confirmed: msg`Étape relue et confirmée, prête à être exécutée.`,
};

export const MIGRATION_COLUMN_STATUS_COLORS: Record<
  S["DatabaseMigrationColumnStatus"],
  string
> = {
  draft: "default",
  to_be_confirmed: "warning",
  confirmed: "success",
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
