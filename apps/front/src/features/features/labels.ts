import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const FEATURE_STATUS_LABELS: Record<
  S["FeatureStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const FEATURE_STATUS_DESCRIPTIONS: Record<
  S["FeatureStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de spécification, non encore engagée.`,
  active: msg`Suivie par l'équipe et visible des membres du compte.`,
  archived: msg`Conservée pour l'historique, plus suivie.`,
};

export const FEATURE_STATUS_COLORS: Record<S["FeatureStatus"], string> = {
  draft: "default",
  active: "success",
  archived: "warning",
};

export const FEATURE_TYPE_LABELS: Record<S["FeatureType"], MessageDescriptor> =
  {
    technical: msg`Technique`,
    product: msg`Produit`,
    qa: msg`Qualité`,
    data: msg`Données`,
    ops: msg`Exploitation`,
    it: msg`Informatique`,
    other: msg`Autre`,
  };

export const FEATURE_TYPE_DESCRIPTIONS: Record<
  S["FeatureType"],
  MessageDescriptor
> = {
  technical: msg`Travail d'implémentation, sans effet direct visible par l'utilisateur.`,
  product: msg`Apport fonctionnel attendu par les utilisateurs du produit.`,
  qa: msg`Effort de test, de recette ou d'assurance qualité.`,
  data: msg`Modélisation, migration ou exploitation de données.`,
  ops: msg`Déploiement, supervision ou exploitation de la plateforme.`,
  it: msg`Poste de travail, outillage ou système d'information interne.`,
  other: msg`Fonctionnalité qui n'entre dans aucune des autres catégories.`,
};

export const FEATURE_TYPE_COLORS: Record<S["FeatureType"], string> = {
  technical: "geekblue",
  product: "blue",
  qa: "purple",
  data: "cyan",
  ops: "volcano",
  it: "gold",
  other: "default",
};

export const FEATURE_FILE_STATUS_LABELS: Record<
  S["FeatureFileStatus"],
  MessageDescriptor
> = {
  uploaded: msg`Déposé`,
  archived: msg`Archivé`,
};

export const FEATURE_FILE_STATUS_DESCRIPTIONS: Record<
  S["FeatureFileStatus"],
  MessageDescriptor
> = {
  uploaded: msg`Pièce jointe courante de la fonctionnalité.`,
  archived: msg`Conservée pour l'historique, plus mise en avant.`,
};

export const FEATURE_FILE_STATUS_COLORS: Record<
  S["FeatureFileStatus"],
  string
> = {
  uploaded: "success",
  archived: "warning",
};

export const FEATURE_FILE_TYPE_LABELS: Record<
  S["FeatureFileType"],
  MessageDescriptor
> = {
  screenshot: msg`Capture d'écran`,
  video: msg`Vidéo`,
  document: msg`Document`,
  other: msg`Autre`,
};

export const FEATURE_FILE_TYPE_DESCRIPTIONS: Record<
  S["FeatureFileType"],
  MessageDescriptor
> = {
  screenshot: msg`Image d'une interface, pour illustrer le comportement attendu.`,
  video: msg`Enregistrement d'un parcours ou d'une démonstration.`,
  document: msg`Spécification, maquette ou tout autre document de référence.`,
  other: msg`Pièce jointe qui n'entre dans aucune des autres catégories.`,
};

export const FEATURE_FILE_TYPE_COLORS: Record<S["FeatureFileType"], string> = {
  screenshot: "blue",
  video: "purple",
  document: "geekblue",
  other: "default",
};
