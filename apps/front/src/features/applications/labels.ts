import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type S = components["schemas"];

export const APPLICATION_STATUS_LABELS: Record<
  S["ApplicationStatus"],
  MessageDescriptor
> = {
  draft: msg`Brouillon`,
  active: msg`Active`,
  archived: msg`Archivée`,
};

export const APPLICATION_STATUS_DESCRIPTIONS: Record<
  S["ApplicationStatus"],
  MessageDescriptor
> = {
  draft: msg`En cours de préparation, non encore publiée.`,
  active: msg`En service et visible par les membres du compte.`,
  archived: msg`Conservée pour l'historique, sans modification possible.`,
};

export const APPLICATION_STATUS_COLORS: Record<S["ApplicationStatus"], string> =
  {
    draft: "default",
    active: "success",
    archived: "warning",
  };

export const APPLICATION_TYPE_LABELS: Record<
  S["ApplicationType"],
  MessageDescriptor
> = {
  backoffice: msg`Back-office`,
  customer: msg`Client`,
  public: msg`Public`,
  mixed: msg`Mixte`,
  other: msg`Autre`,
};

export const APPLICATION_TYPE_DESCRIPTIONS: Record<
  S["ApplicationType"],
  MessageDescriptor
> = {
  backoffice: msg`Interface interne réservée aux équipes.`,
  customer: msg`Application destinée aux clients authentifiés.`,
  public: msg`Application accessible sans authentification.`,
  mixed: msg`Combine des espaces publics et authentifiés.`,
  other: msg`Ne correspond à aucune des catégories ci-dessus.`,
};

export const APPLICATION_TYPE_COLORS: Record<S["ApplicationType"], string> = {
  backoffice: "geekblue",
  customer: "blue",
  public: "green",
  mixed: "purple",
  other: "default",
};

export const ENVIRONMENT_TYPE_LABELS: Record<
  S["ApplicationEnvironmentType"],
  MessageDescriptor
> = {
  production: msg`Production`,
  "pre-production": msg`Pré-production`,
  test: msg`Test`,
  features: msg`Fonctionnalités`,
  hotfix: msg`Correctif`,
  other: msg`Autre`,
};

export const ENVIRONMENT_TYPE_DESCRIPTIONS: Record<
  S["ApplicationEnvironmentType"],
  MessageDescriptor
> = {
  production: msg`Environnement live utilisé par les utilisateurs finaux.`,
  "pre-production": msg`Réplique de la production servant aux validations avant mise en ligne.`,
  test: msg`Environnement dédié aux tests automatisés et manuels.`,
  features: msg`Environnement éphémère dédié à une fonctionnalité en cours.`,
  hotfix: msg`Environnement dédié aux correctifs urgents.`,
  other: msg`Ne correspond à aucune des catégories ci-dessus.`,
};

export const ENVIRONMENT_TYPE_COLORS: Record<
  S["ApplicationEnvironmentType"],
  string
> = {
  production: "red",
  "pre-production": "orange",
  test: "blue",
  features: "purple",
  hotfix: "volcano",
  other: "default",
};

export const DEPLOYMENT_STATUS_LABELS: Record<
  S["ApplicationEnvironmentVersionStatus"],
  MessageDescriptor
> = {
  standby: msg`En cours`,
  finished: msg`Terminé`,
  error: msg`En erreur`,
  cancelled: msg`Annulé`,
};

export const DEPLOYMENT_STATUS_DESCRIPTIONS: Record<
  S["ApplicationEnvironmentVersionStatus"],
  MessageDescriptor
> = {
  standby: msg`Déploiement démarré, en attente de son résultat.`,
  finished: msg`Déploiement terminé avec succès.`,
  error: msg`Déploiement interrompu par une erreur.`,
  cancelled: msg`Déploiement annulé avant sa fin.`,
};

export const DEPLOYMENT_STATUS_COLORS: Record<
  S["ApplicationEnvironmentVersionStatus"],
  string
> = {
  standby: "processing",
  finished: "success",
  error: "error",
  cancelled: "default",
};

export const VERSION_TYPE_LABELS: Record<
  S["ApplicationVersionType"],
  MessageDescriptor
> = {
  alpha: msg`Alpha`,
  beta: msg`Bêta`,
  stable: msg`Stable`,
  dev: msg`Développement`,
};

export const VERSION_TYPE_DESCRIPTIONS: Record<
  S["ApplicationVersionType"],
  MessageDescriptor
> = {
  alpha: msg`Version instable réservée aux tests internes.`,
  beta: msg`Version en cours de validation par un public restreint.`,
  stable: msg`Version validée, destinée à la production.`,
  dev: msg`Version de travail, en cours de développement.`,
};

export const VERSION_TYPE_COLORS: Record<S["ApplicationVersionType"], string> =
  {
    alpha: "volcano",
    beta: "gold",
    stable: "success",
    dev: "default",
  };

export const GUARD_TYPE_LABELS: Record<
  S["ApplicationGuardType"],
  MessageDescriptor
> = {
  header_bearer: msg`Bearer (en-tête)`,
  header_basic: msg`Basic (en-tête)`,
  header_token: msg`Token (en-tête)`,
  query_token: msg`Token (query)`,
};

export const GUARD_TYPE_DESCRIPTIONS: Record<
  S["ApplicationGuardType"],
  MessageDescriptor
> = {
  header_bearer: msg`Jeton porteur transmis dans l'en-tête Authorization.`,
  header_basic: msg`Identifiants encodés en Basic dans l'en-tête Authorization.`,
  header_token: msg`Jeton transmis dans un en-tête dédié.`,
  query_token: msg`Jeton transmis dans un paramètre d'URL.`,
};

export const GUARD_TYPE_COLORS: Record<S["ApplicationGuardType"], string> = {
  header_bearer: "geekblue",
  header_basic: "purple",
  header_token: "blue",
  query_token: "cyan",
};

export const GUARD_FIELD_TYPE_LABELS: Record<
  S["ApplicationGuardFieldType"],
  MessageDescriptor
> = {
  header: msg`En-tête`,
  query: msg`Paramètre d'URL`,
  post_data: msg`Corps de requête`,
  raw_data: msg`Données brutes`,
};

export const GUARD_FIELD_FORMAT_LABELS: Record<
  S["ApplicationGuardFieldFormat"],
  MessageDescriptor
> = {
  JWT: msg`JWT`,
};

/**
 * Swagger UI's opblock palette — hex values are data here (they drive the
 * method badges and the operation block tints), not theme tokens.
 */
export const ROUTE_METHOD_COLORS: Record<S["ApplicationRouteMethod"], string> =
  {
    GET: "#61affe",
    POST: "#49cc90",
    PATCH: "#50e3c2",
    PUT: "#fca130",
    DELETE: "#f93e3e",
    QUERY: "#9012fe",
  };
