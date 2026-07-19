// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const SERVICE_STATUS_LABELS: Record<
  S["ServiceStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Actif`,
  archived: msg`Archivé`,
};

export const SERVICE_STATUS_DESCRIPTIONS: Record<
  S["ServiceStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de préparation, non encore publié.`,
  active: msg`En service et visible par les membres du compte.`,
  archived: msg`Conservé pour l'historique, sans modification possible.`,
};

export const SERVICE_STATUS_COLORS: Record<S["ServiceStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const SERVICE_TYPE_LABELS: Record<S["ServiceType"], MessageDescriptor> =
  {
    internal: msg`Interne`,
    external: msg`Externe`,
    third_party: msg`Tiers`,
    other: msg`Autre`,
  };

export const SERVICE_TYPE_DESCRIPTIONS: Record<
  S["ServiceType"],
  MessageDescriptor
> = {
  internal: msg`Développé et hébergé par vos équipes.`,
  external: msg`Exposé par une autre entité, mais sous votre contrôle.`,
  third_party: msg`Fourni par un prestataire extérieur.`,
  other: msg`Ne correspond à aucune des catégories ci-dessus.`,
};

export const SERVICE_TYPE_COLORS: Record<S["ServiceType"], string> = {
  internal: "geekblue",
  external: "blue",
  third_party: "purple",
  other: "default",
};

export const SERVICE_CATEGORY_LABELS: Record<
  S["ServiceCategory"],
  MessageDescriptor
> = {
  payment: msg`Paiement`,
  communication: msg`Communication`,
  automation: msg`Automatisation`,
  contractualization: msg`Contractualisation`,
  authentication: msg`Authentification`,
  storage: msg`Stockage`,
  analytics: msg`Analytics`,
  messaging: msg`Messagerie`,
  monitoring: msg`Supervision`,
  hosting: msg`Hébergement`,
  database: msg`Base de données`,
  other: msg`Autre`,
};

export const SERVICE_CATEGORY_DESCRIPTIONS: Record<
  S["ServiceCategory"],
  MessageDescriptor
> = {
  payment: msg`Encaissement, facturation ou traitement des paiements.`,
  communication: msg`Envoi d'e-mails, de SMS ou de notifications.`,
  automation: msg`Orchestration de tâches et de workflows.`,
  contractualization: msg`Signature électronique et gestion de contrats.`,
  authentication: msg`Identité, connexion et gestion des accès.`,
  storage: msg`Stockage de fichiers ou d'objets.`,
  analytics: msg`Mesure d'audience et analyse de données.`,
  messaging: msg`Messagerie instantanée ou bus d'événements.`,
  monitoring: msg`Supervision, journalisation et alertes.`,
  hosting: msg`Hébergement d'applications ou d'infrastructure.`,
  database: msg`Base de données ou service de persistance.`,
  other: msg`Ne correspond à aucune des catégories ci-dessus.`,
};

export const SERVICE_CATEGORY_COLORS: Record<S["ServiceCategory"], string> = {
  payment: "green",
  communication: "blue",
  automation: "geekblue",
  contractualization: "gold",
  authentication: "red",
  storage: "cyan",
  analytics: "magenta",
  messaging: "purple",
  monitoring: "volcano",
  hosting: "lime",
  database: "orange",
  other: "default",
};

export const ACTION_STATUS_LABELS: Record<
  S["ServiceActionStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const ACTION_STATUS_DESCRIPTIONS: Record<
  S["ServiceActionStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de préparation, non encore publiée.`,
  active: msg`En service et visible par les membres du compte.`,
  archived: msg`Conservée pour l'historique, sans modification possible.`,
};

export const ACTION_STATUS_COLORS: Record<S["ServiceActionStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const ACTION_TYPE_LABELS: Record<
  S["ServiceActionType"],
  MessageDescriptor
> = {
  endpoint: msg`Endpoint`,
  webhook: msg`Webhook`,
  event: msg`Événement`,
  job: msg`Tâche planifiée`,
  other: msg`Autre`,
};

export const ACTION_TYPE_DESCRIPTIONS: Record<
  S["ServiceActionType"],
  MessageDescriptor
> = {
  endpoint: msg`Point d'entrée HTTP appelé à la demande.`,
  webhook: msg`Appel sortant déclenché par le service vers un tiers.`,
  event: msg`Message publié sur un bus, consommé de façon asynchrone.`,
  job: msg`Traitement exécuté périodiquement, sans appel entrant.`,
  other: msg`Ne correspond à aucune des catégories ci-dessus.`,
};

export const ACTION_TYPE_COLORS: Record<S["ServiceActionType"], string> = {
  endpoint: "blue",
  webhook: "purple",
  event: "cyan",
  job: "gold",
  other: "default",
};
