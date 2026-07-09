import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const JOURNEY_STATUS_LABELS: Record<
  S["JourneyStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Actif`,
  archived: msg`Archivé`,
};

export const JOURNEY_STATUS_DESCRIPTIONS: Record<
  S["JourneyStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de rédaction, non encore partagé avec l'équipe.`,
  active: msg`Parcours de référence, sur lequel l'équipe s'appuie.`,
  archived: msg`Conservé pour l'historique, plus utilisé.`,
};

export const JOURNEY_STATUS_COLORS: Record<S["JourneyStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const JOURNEY_TYPE_LABELS: Record<S["JourneyType"], MessageDescriptor> =
  {
    business: msg`Métier`,
    customer: msg`Client`,
    internal: msg`Interne`,
    other: msg`Autre`,
  };

export const JOURNEY_TYPE_DESCRIPTIONS: Record<
  S["JourneyType"],
  MessageDescriptor
> = {
  business: msg`Parcours suivi par un interlocuteur métier.`,
  customer: msg`Parcours suivi par un utilisateur final du produit.`,
  internal: msg`Parcours suivi par un membre de l'organisation.`,
  other: msg`Parcours qui n'entre dans aucune des autres catégories.`,
};

export const JOURNEY_TYPE_COLORS: Record<S["JourneyType"], string> = {
  business: "gold",
  customer: "blue",
  internal: "purple",
  other: "default",
};
