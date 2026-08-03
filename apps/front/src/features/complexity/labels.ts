// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const COMPLEXITY_MODE_LABELS: Record<
  S["ComplexityMode"],
  MessageDescriptor
> = {
  fibonacci: msg`Fibonacci`,
  modified_fibonacci: msg`Fibonacci modifié`,
  powers_of_two: msg`Puissances de deux`,
  linear: msg`Linéaire`,
};

/** The cards each scale offers — what the estimator actually sees. */
export const COMPLEXITY_MODE_DESCRIPTIONS: Record<
  S["ComplexityMode"],
  MessageDescriptor
> = {
  fibonacci: msg`1, 2, 3, 5, 8, 13, 21, 34, 55, 89`,
  modified_fibonacci: msg`0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100`,
  powers_of_two: msg`1, 2, 4, 8, 16, 32`,
  linear: msg`1 à 10`,
};

export const COMPLEXITY_SCOPE_LABELS: Record<
  S["ComplexityScope"],
  MessageDescriptor
> = {
  technical: msg`Technique`,
  product: msg`Produit`,
};

export const COMPLEXITY_SCOPE_DESCRIPTIONS: Record<
  S["ComplexityScope"],
  MessageDescriptor
> = {
  technical: msg`Applications, routes, bases de données et services.`,
  product: msg`Fonctionnalités, personas et parcours utilisateurs.`,
};

/**
 * Which of the account's two scales estimates a given kind of entity — the
 * mirror of the backend's `COMPLEXITY_SCOPES`. Exhaustive by type, so a new
 * entity type fails the build here rather than silently landing on a default.
 */
export const COMPLEXITY_SCOPE_BY_ENTITY: Record<
  S["EntityType"],
  S["ComplexityScope"]
> = {
  application: "technical",
  application_component: "technical",
  application_route: "technical",
  database: "technical",
  database_migration: "technical",
  database_migration_column: "technical",
  database_table: "technical",
  database_table_column: "technical",
  service: "technical",
  service_action: "technical",
  feature: "product",
  journey: "product",
  journey_scenario: "product",
  journey_scenario_step: "product",
  persona: "product",
};
