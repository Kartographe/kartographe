// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

// Index types keep their technical spelling — they are the names PostgreSQL and
// MySQL use — so the labels are not really translatable copy.
export const INDEX_TYPE_LABELS: Record<S["IndexType"], MessageDescriptor> = {
  btree: msg`B-tree`,
  hash: msg`Hash`,
  gin: msg`GIN`,
  gist: msg`GiST`,
  brin: msg`BRIN`,
};

export const INDEX_TYPE_DESCRIPTIONS: Record<
  S["IndexType"],
  MessageDescriptor
> = {
  btree: msg`Index équilibré généraliste, adapté aux comparaisons et aux tris.`,
  hash: msg`Index de hachage, pour les seules égalités.`,
  gin: msg`Index inversé, adapté aux tableaux, au JSON et à la recherche plein texte.`,
  gist: msg`Index généralisé pour les données géométriques et les plages.`,
  brin: msg`Index par blocs, compact, pour les grandes tables naturellement ordonnées.`,
};

export const INDEX_TYPE_COLORS: Record<S["IndexType"], string> = {
  btree: "blue",
  hash: "cyan",
  gin: "purple",
  gist: "geekblue",
  brin: "gold",
};

export const CONSTRAINT_TYPE_LABELS: Record<
  S["ConstraintType"],
  MessageDescriptor
> = {
  primary_key: msg`Clé primaire`,
  unique: msg`Unique`,
  foreign_key: msg`Clé étrangère`,
  check: msg`Vérification`,
  not_null: msg`Non nul`,
};

export const CONSTRAINT_TYPE_DESCRIPTIONS: Record<
  S["ConstraintType"],
  MessageDescriptor
> = {
  primary_key: msg`Identifie chaque ligne de façon unique et non nulle.`,
  unique: msg`Interdit les doublons sur la ou les colonnes.`,
  foreign_key: msg`Référence une clé d'une autre table.`,
  check: msg`Impose une condition sur les valeurs de la ligne.`,
  not_null: msg`Interdit les valeurs nulles.`,
};

export const CONSTRAINT_TYPE_COLORS: Record<S["ConstraintType"], string> = {
  primary_key: "gold",
  unique: "blue",
  foreign_key: "geekblue",
  check: "purple",
  not_null: "default",
};

export const REFERENTIAL_ACTION_LABELS: Record<
  S["ReferentialAction"],
  MessageDescriptor
> = {
  no_action: msg`Aucune action`,
  restrict: msg`Restreindre`,
  cascade: msg`Cascade`,
  set_null: msg`Mettre à NULL`,
  set_default: msg`Valeur par défaut`,
};
