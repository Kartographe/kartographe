// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

/**
 * Human labels for the usage report, keyed by the backend's stable entity/group
 * `key`. The API returns only keys (doc is English + the front is i18n'd), so the
 * FR wording lives here. A missing key falls back to the raw key in the screen.
 */

export const USAGE_GROUP_LABELS: Record<string, MessageDescriptor> = {
  members: msg`Membres`,
  applications: msg`Applications`,
  databases: msg`Bases de données`,
  features: msg`Features`,
  journeys: msg`Parcours`,
  personas: msg`Personas`,
  services: msg`Services`,
  content: msg`Contenu`,
};

export const USAGE_ENTITY_LABELS: Record<string, MessageDescriptor> = {
  accountUser: msg`Utilisateur actif`,
  application: msg`Application`,
  applicationVersion: msg`Version d'application`,
  applicationEnvironment: msg`Environnement`,
  applicationEnvironmentVersion: msg`Déploiement`,
  applicationFeature: msg`Feature d'application`,
  applicationGuard: msg`Guard`,
  applicationRole: msg`Rôle d'application`,
  applicationRoute: msg`Route`,
  applicationRouteExample: msg`Exemple de route`,
  applicationRouteResponse: msg`Réponse de route`,
  applicationRouteTable: msg`Table de route`,
  database: msg`Base de données`,
  databaseVersion: msg`Version de base`,
  databaseTable: msg`Table`,
  databaseTableColumn: msg`Colonne`,
  databaseMigration: msg`Migration`,
  databaseMigrationColumn: msg`Colonne de migration`,
  feature: msg`Feature`,
  featureFile: msg`Fichier de feature`,
  featureJourney: msg`Parcours de feature`,
  journey: msg`Parcours`,
  journeyScenario: msg`Scénario`,
  journeyScenarioStep: msg`Étape de scénario`,
  journeyScenarioStepAssertion: msg`Assertion`,
  journeyScenarioStepFile: msg`Fichier d'étape`,
  journeyScenarioStepRoute: msg`Route d'étape`,
  persona: msg`Persona`,
  service: msg`Service`,
  serviceAction: msg`Action de service`,
  tag: msg`Tag`,
  comment: msg`Commentaire`,
};
