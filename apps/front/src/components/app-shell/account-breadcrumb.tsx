import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import { Breadcrumb } from "antd";
import { $api } from "@/api/$api";

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
  tables: msg`Tables`,
};

interface Crumb {
  key: string;
  label: string;
  href: string;
}

/**
 * Resolves the id sitting right after its collection — `.../applications/{id}`,
 * `.../services/{id}`, `.../databases/{id}` — to that entity's title. Deeper ids
 * (a route, an action, a table) never reach the URL, so one lookup per
 * collection is enough.
 *
 * Returns a map from the id found in the path to its label; empty when the path
 * points at no entity.
 */
function useEntityLabels(
  accountId: string,
  rest: string[]
): Map<string, string> {
  const { t } = useLingui();

  const applicationId =
    rest[0] === "applications" && rest[1] ? rest[1] : undefined;
  const serviceId = rest[0] === "services" && rest[1] ? rest[1] : undefined;
  const databaseId = rest[0] === "databases" && rest[1] ? rest[1] : undefined;

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

  const labels = new Map<string, string>();
  if (applicationId) {
    labels.set(
      applicationId,
      applicationQuery.data?.item.title ?? t`Application`
    );
  }
  if (serviceId) {
    labels.set(serviceId, serviceQuery.data?.item.title ?? t`Service`);
  }
  if (databaseId) {
    labels.set(
      databaseId,
      databaseQuery.data?.item.title ?? t`Base de données`
    );
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
