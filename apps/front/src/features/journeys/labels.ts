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

export const SCENARIO_STATUS_LABELS: Record<
  S["JourneyScenarioStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Actif`,
  archived: msg`Archivé`,
};

export const SCENARIO_STATUS_DESCRIPTIONS: Record<
  S["JourneyScenarioStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de rédaction, non encore joué.`,
  active: msg`Scénario de référence, rejoué à chaque recette.`,
  archived: msg`Conservé pour l'historique, plus rejoué.`,
};

export const SCENARIO_STATUS_COLORS: Record<
  S["JourneyScenarioStatus"],
  string
> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const SCENARIO_TYPE_LABELS: Record<
  S["JourneyScenarioType"],
  MessageDescriptor
> = {
  nominal: msg`Nominal`,
  alternative: msg`Alternatif`,
  error: msg`Erreur`,
  edge_case: msg`Cas limite`,
};

export const SCENARIO_TYPE_DESCRIPTIONS: Record<
  S["JourneyScenarioType"],
  MessageDescriptor
> = {
  nominal: msg`Le chemin attendu, quand tout se passe bien.`,
  alternative: msg`Une autre façon d'arriver au même résultat.`,
  error: msg`Ce qui doit se produire quand l'utilisateur ou le système échoue.`,
  edge_case: msg`Un cas rare, aux bornes de ce que le produit accepte.`,
};

export const SCENARIO_TYPE_COLORS: Record<S["JourneyScenarioType"], string> = {
  nominal: "green",
  alternative: "blue",
  error: "red",
  edge_case: "purple",
};

export const SCENARIO_CRITICITY_LABELS: Record<
  S["JourneyScenarioCriticity"],
  MessageDescriptor
> = {
  low: msg`Faible`,
  medium: msg`Moyenne`,
  high: msg`Élevée`,
  critical: msg`Critique`,
};

export const SCENARIO_CRITICITY_DESCRIPTIONS: Record<
  S["JourneyScenarioCriticity"],
  MessageDescriptor
> = {
  low: msg`Une régression ici gênerait peu l'utilisateur.`,
  medium: msg`Une régression ici dégraderait l'expérience.`,
  high: msg`Une régression ici empêcherait un usage important.`,
  critical: msg`Une régression ici rendrait le produit inutilisable.`,
};

export const SCENARIO_CRITICITY_COLORS: Record<
  S["JourneyScenarioCriticity"],
  string
> = {
  low: "default",
  medium: "blue",
  high: "orange",
  critical: "red",
};

export const STEP_FILE_TYPE_LABELS: Record<
  S["JourneyScenarioStepFileType"],
  MessageDescriptor
> = {
  screenshot: msg`Capture d'écran`,
  video: msg`Vidéo`,
  document: msg`Document`,
  input: msg`Jeu de données`,
  other: msg`Autre`,
};

export const STEP_FILE_TYPE_DESCRIPTIONS: Record<
  S["JourneyScenarioStepFileType"],
  MessageDescriptor
> = {
  screenshot: msg`Image de l'écran tel qu'il doit apparaître à cette étape.`,
  video: msg`Enregistrement de l'étape en train d'être jouée.`,
  document: msg`Spécification, maquette ou tout autre document de référence.`,
  input: msg`Données à saisir ou à injecter pour jouer l'étape.`,
  other: msg`Pièce jointe qui n'entre dans aucune des autres catégories.`,
};

export const STEP_FILE_TYPE_COLORS: Record<
  S["JourneyScenarioStepFileType"],
  string
> = {
  screenshot: "blue",
  video: "purple",
  document: "geekblue",
  input: "cyan",
  other: "default",
};

export const STEP_FILE_STATUS_LABELS: Record<
  S["JourneyScenarioStepFileStatus"],
  MessageDescriptor
> = {
  uploaded: msg`Déposé`,
  archived: msg`Archivé`,
};

export const STEP_FILE_STATUS_DESCRIPTIONS: Record<
  S["JourneyScenarioStepFileStatus"],
  MessageDescriptor
> = {
  uploaded: msg`Pièce jointe courante de l'étape.`,
  archived: msg`Conservée pour l'historique, plus mise en avant.`,
};

export const STEP_FILE_STATUS_COLORS: Record<
  S["JourneyScenarioStepFileStatus"],
  string
> = {
  uploaded: "success",
  archived: "warning",
};

export const ASSERTION_STATUS_LABELS: Record<
  S["JourneyScenarioStepAssertionStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const ASSERTION_STATUS_DESCRIPTIONS: Record<
  S["JourneyScenarioStepAssertionStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours d'écriture, non encore vérifiée.`,
  active: msg`Vérifiée à chaque exécution du scénario.`,
  archived: msg`Conservée pour l'historique, plus vérifiée.`,
};

export const ASSERTION_STATUS_COLORS: Record<
  S["JourneyScenarioStepAssertionStatus"],
  string
> = {
  draft: "default",
  active: "success",
  archived: "warning",
};
