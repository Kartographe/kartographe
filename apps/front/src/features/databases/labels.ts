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

/** `[1, 2, 0]` → `v1.2.0`. */
export function formatVersion(version: number[]): string {
  return `v${version.join(".")}`;
}
