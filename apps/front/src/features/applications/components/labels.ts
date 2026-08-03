// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const COMPONENT_TYPE_LABELS: Record<
  S["ApplicationComponentType"],
  MessageDescriptor
> = {
  frontend: msg`Front-end`,
  backend: msg`Back-end`,
  library: msg`Bibliothèque`,
  worker: msg`Worker`,
  integration: msg`Intégration`,
  other: msg`Autre`,
};

export const COMPONENT_TYPE_DESCRIPTIONS: Record<
  S["ApplicationComponentType"],
  MessageDescriptor
> = {
  frontend: msg`Interface exécutée côté client : SPA, site, application mobile.`,
  backend: msg`Service exécuté côté serveur : API, moteur métier, back-office.`,
  library: msg`Code partagé entre plusieurs briques, sans exécution autonome.`,
  worker: msg`Traitement asynchrone : file d'attente, tâche planifiée, batch.`,
  integration: msg`Branchement sur un système tiers : SDK, connecteur, webhook.`,
  other: msg`Brique qui n'entre dans aucune des catégories précédentes.`,
};

export const COMPONENT_TYPE_COLORS: Record<
  S["ApplicationComponentType"],
  string
> = {
  frontend: "geekblue",
  backend: "purple",
  library: "cyan",
  worker: "orange",
  integration: "magenta",
  other: "default",
};

export const COMPONENT_STATUS_LABELS: Record<
  S["ApplicationComponentStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Actif`,
  archived: msg`Archivé`,
};

export const COMPONENT_STATUS_DESCRIPTIONS: Record<
  S["ApplicationComponentStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de description, pas encore validé.`,
  active: msg`En service dans l'application.`,
  archived: msg`Conservé pour l'historique, plus en service.`,
};

export const COMPONENT_STATUS_COLORS: Record<
  S["ApplicationComponentStatus"],
  string
> = {
  draft: "default",
  active: "success",
  archived: "warning",
};
