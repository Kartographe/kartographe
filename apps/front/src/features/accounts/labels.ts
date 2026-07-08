import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { components } from "@/api/generated/schema";

type Role = components["schemas"]["AccountUserRole"];
type InvitationStatus = components["schemas"]["AccountUserInvitationStatus"];
type AccountStatus = components["schemas"]["AccountStatus"];
type MembershipType = components["schemas"]["AccountUserType"];
type MembershipStatus = components["schemas"]["AccountUserStatus"];

export const ROLE_LABELS: Record<Role, MessageDescriptor> = {
  owner: msg`Propriétaire`,
  administrator: msg`Administrateur`,
  product_owner: msg`Product Owner`,
  qa_manager: msg`Responsable QA`,
  lead_developer: msg`Lead Developer`,
  developer: msg`Développeur`,
  data_analyst: msg`Data Analyst`,
  commentator: msg`Commentateur`,
};

export const ROLE_DESCRIPTIONS: Record<Role, MessageDescriptor> = {
  owner: msg`Contrôle total du compte, dont la gestion des propriétaires et la suppression.`,
  administrator: msg`Gère les membres, les invitations et les paramètres du compte.`,
  product_owner: msg`Pilote le produit et arbitre les priorités.`,
  qa_manager: msg`Supervise la qualité, les tests et la validation.`,
  lead_developer: msg`Encadre l'équipe technique et les développements.`,
  developer: msg`Contribue au développement du produit.`,
  data_analyst: msg`Analyse les données et la métrologie du compte.`,
  commentator: msg`Accès en lecture avec possibilité de commenter.`,
};

export const ROLE_COLORS: Record<Role, string> = {
  owner: "gold",
  administrator: "geekblue",
  product_owner: "purple",
  qa_manager: "cyan",
  lead_developer: "blue",
  developer: "green",
  data_analyst: "volcano",
  commentator: "default",
};

export const INVITATION_STATUS_LABELS: Record<
  InvitationStatus,
  MessageDescriptor
> = {
  standby: msg`En attente`,
  accepted: msg`Acceptée`,
  refused: msg`Refusée`,
  expired: msg`Expirée`,
  cancelled: msg`Annulée`,
};

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  standby: "processing",
  accepted: "success",
  refused: "error",
  expired: "default",
  cancelled: "default",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, MessageDescriptor> = {
  active: msg`Actif`,
  disabled: msg`Désactivé`,
  blocked: msg`Bloqué`,
};

export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  active: "success",
  disabled: "default",
  blocked: "error",
};

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, MessageDescriptor> =
  {
    creator: msg`Créateur`,
    guest: msg`Invité`,
  };

export const MEMBERSHIP_STATUS_LABELS: Record<
  MembershipStatus,
  MessageDescriptor
> = {
  active: msg`Actif`,
  disabled: msg`Désactivé`,
};
