// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type StatEntityKey = components["schemas"]["StatEntityKey"];
type EntityType = components["schemas"]["EntityType"];

/** The three dashboard viewpoints the segmented control switches between. */
export type Typology = "overview" | "produit" | "technique";

export const TYPOLOGY_LABELS: Record<Typology, MessageDescriptor> = {
  overview: msg`Vue d'ensemble`,
  produit: msg`Produit`,
  technique: msg`Technique`,
};

/** Human label for every statistics metric key. */
export const METRIC_LABELS: Record<StatEntityKey, MessageDescriptor> = {
  applications: msg`Applications`,
  comments: msg`Commentaires`,
  databases: msg`Bases de données`,
  features: msg`Fonctionnalités`,
  journeys: msg`Parcours`,
  personas: msg`Personas`,
  routes: msg`Routes`,
  scenarios: msg`Scénarios`,
  services: msg`Services`,
  votes: msg`Votes`,
};

/**
 * Which metrics each viewpoint surfaces, in display order. `/stats` returns them
 * all; the segmented control only picks the subset to render — no re-fetch.
 *
 * The overview stays deliberately generic: cross-cutting engagement (comments,
 * votes) plus a synthetic "Activité" total (see {@link ACTIVITY_KEYS}). The
 * domain-specific counts live in their dedicated tabs, never duplicated here.
 */
export const METRIC_GROUPS: Record<Typology, StatEntityKey[]> = {
  overview: ["comments", "votes"],
  produit: ["features", "journeys", "scenarios", "personas"],
  technique: ["applications", "databases", "services", "routes"],
};

/**
 * The entity-creation metrics summed into the synthetic "Activité" KPI shown on
 * the overview — every produced artefact, excluding engagement (comments,
 * votes) which get their own tiles.
 */
export const ACTIVITY_KEYS: StatEntityKey[] = [
  "features",
  "journeys",
  "scenarios",
  "personas",
  "applications",
  "databases",
  "services",
  "routes",
];

/** Label for the synthetic overview "Activité" KPI. */
export const ACTIVITY_LABEL: MessageDescriptor = msg`Activité`;

/** Singular label for the entity a comment or vote points at. */
export const ENTITY_TYPE_LABELS: Record<EntityType, MessageDescriptor> = {
  application: msg`Application`,
  application_component: msg`Composant`,
  application_route: msg`Route`,
  database: msg`Base de données`,
  database_migration: msg`Migration`,
  database_migration_column: msg`Colonne de migration`,
  database_table: msg`Table`,
  database_table_column: msg`Colonne`,
  feature: msg`Fonctionnalité`,
  journey: msg`Parcours`,
  journey_scenario: msg`Scénario`,
  journey_scenario_step: msg`Étape`,
  persona: msg`Persona`,
  service: msg`Service`,
  service_action: msg`Action de service`,
};
