// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const PERSONA_STATUS_LABELS: Record<
  S["PersonaStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Actif`,
  archived: msg`Archivé`,
};

export const PERSONA_STATUS_DESCRIPTIONS: Record<
  S["PersonaStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de rédaction, non encore partagé avec l'équipe.`,
  active: msg`Archétype de référence, sur lequel l'équipe s'appuie.`,
  archived: msg`Conservé pour l'historique, plus utilisé.`,
};

export const PERSONA_STATUS_COLORS: Record<S["PersonaStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const PERSONA_TYPE_LABELS: Record<S["PersonaType"], MessageDescriptor> =
  {
    customer: msg`Client`,
    business: msg`Métier`,
    internal: msg`Interne`,
    other: msg`Autre`,
  };

export const PERSONA_TYPE_DESCRIPTIONS: Record<
  S["PersonaType"],
  MessageDescriptor
> = {
  customer: msg`Utilisateur final du produit, extérieur à l'organisation.`,
  business: msg`Interlocuteur métier qui exploite le produit sans le construire.`,
  internal: msg`Membre de l'organisation qui construit ou opère le produit.`,
  other: msg`Archétype qui n'entre dans aucune des autres catégories.`,
};

export const PERSONA_TYPE_COLORS: Record<S["PersonaType"], string> = {
  customer: "blue",
  business: "gold",
  internal: "purple",
  other: "default",
};
