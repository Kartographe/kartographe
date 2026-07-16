// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import { Breadcrumb } from "antd";
import { $api } from "@/api/$api";
import { formatVersion } from "@/features/databases/labels";

/** Static path segments → their crumb label. */
const SEGMENT_LABELS: Record<string, MessageDescriptor> = {
  administration: msg`Administration`,
  information: msg`Informations`,
  members: msg`Membres`,
  invitations: msg`Invitations`,
  advanced: msg`Avancé`,
  applications: msg`Applications`,
  environments: msg`Environnements`,
  deployments: msg`Déploiements`,
  guards: msg`Guards`,
  roles: msg`Rôles`,
  versions: msg`Versions`,
  routes: msg`Routes`,
  comments: msg`Commentaires`,
  services: msg`Services`,
  actions: msg`Actions`,
  databases: msg`Bases de données`,
  features: msg`Fonctionnalités`,
  files: msg`Fichiers`,
  journeys: msg`Parcours utilisateurs`,
  personas: msg`Personas`,
  scenarios: msg`Scénarios`,
  tags: msg`Tags`,
};

interface Crumb {
  key: string;
  label: string;
  href: string;
}

interface PathIds {
  applicationId?: string;
  serviceId?: string;
  databaseId?: string;
  versionId?: string;
  featureId?: string;
  journeyId?: string;
}

/**
 * Picks out the entity ids a path carries. Only an id sitting right after its
 * collection counts — plus the version nested under a database. Ids below that
 * (a route, an action, a table) never reach the URL.
 */
function pathIds(rest: string[]): PathIds {
  const [collection, id, sub, subId] = rest;
  const databaseId = collection === "databases" ? id : undefined;
  return {
    applicationId: collection === "applications" ? id : undefined,
    serviceId: collection === "services" ? id : undefined,
    featureId: collection === "features" ? id : undefined,
    journeyId: collection === "journeys" ? id : undefined,
    databaseId,
    versionId: databaseId && sub === "versions" ? subId : undefined,
  };
}

/**
 * Resolves each id found in the path to the title it stands for.
 *
 * Returns a map from the id to its label; empty when the path points at no
 * entity.
 */
function useEntityLabels(
  accountId: string,
  rest: string[]
): Map<string, string> {
  const { t } = useLingui();
  const {
    applicationId,
    serviceId,
    databaseId,
    versionId,
    featureId,
    journeyId,
  } = pathIds(rest);

  const applicationQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}",
    {
      params: {
        path: { account_id: accountId, application_id: applicationId ?? "" },
      },
    },
    { enabled: !!applicationId }
  );
  const serviceQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services/{service_id}",
    {
      params: { path: { account_id: accountId, service_id: serviceId ?? "" } },
    },
    { enabled: !!serviceId }
  );
  const databaseQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}",
    {
      params: {
        path: { account_id: accountId, database_id: databaseId ?? "" },
      },
    },
    { enabled: !!databaseId }
  );
  const featureQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features/{feature_id}",
    {
      params: { path: { account_id: accountId, feature_id: featureId ?? "" } },
    },
    { enabled: !!featureId }
  );
  const journeyQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    {
      params: { path: { account_id: accountId, journey_id: journeyId ?? "" } },
    },
    { enabled: !!journeyId }
  );
  const versionQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId ?? "",
          database_version_id: versionId ?? "",
        },
      },
    },
    { enabled: !!versionId }
  );

  const versionItem = versionQuery.data?.item;
  // Each pair is (id in the path, label to show); a missing id is skipped, and
  // an unresolved title falls back to the entity's generic name.
  const resolved: [string | undefined, string][] = [
    [applicationId, applicationQuery.data?.item.title ?? t`Application`],
    [serviceId, serviceQuery.data?.item.title ?? t`Service`],
    [featureId, featureQuery.data?.item.title ?? t`Fonctionnalité`],
    [journeyId, journeyQuery.data?.item.title ?? t`Parcours utilisateur`],
    [databaseId, databaseQuery.data?.item.title ?? t`Base de données`],
    [versionId, versionItem ? formatVersion(versionItem.version) : t`Version`],
  ];

  const labels = new Map<string, string>();
  for (const [id, label] of resolved) {
    if (id) {
      labels.set(id, label);
    }
  }
  return labels;
}

/**
 * Breadcrumb for every `/accounts/$accountId/*` page. Static segments are
 * translated from `SEGMENT_LABELS`; the account id, and the id of whichever
 * entity is being browsed, are resolved to their titles.
 */
export function AccountBreadcrumb({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const segments = pathname.split("/").filter(Boolean);
  // ["accounts", accountId, ...rest]
  const rest = segments.slice(2);

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const entityLabels = useEntityLabels(accountId, rest);

  const crumbs: Crumb[] = [
    {
      key: "account",
      label: accountQuery.data?.item.name ?? t`Compte`,
      href: `/accounts/${accountId}`,
    },
  ];

  let href = `/accounts/${accountId}`;
  for (const segment of rest) {
    href = `${href}/${segment}`;
    const entityLabel = entityLabels.get(segment);
    if (entityLabel) {
      crumbs.push({ key: segment, label: entityLabel, href });
      continue;
    }
    const label = SEGMENT_LABELS[segment];
    if (label) {
      crumbs.push({ key: segment, label: t(label), href });
    }
  }

  if (crumbs.length < 2) {
    return null;
  }

  return (
    <Breadcrumb
      items={crumbs.map((crumb, index) => ({
        key: crumb.key,
        title:
          index === crumbs.length - 1 ? (
            crumb.label
          ) : (
            <Link to={crumb.href}>{crumb.label}</Link>
          ),
      }))}
      style={{ marginBottom: 16 }}
    />
  );
}
