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
};

interface Crumb {
  key: string;
  label: string;
  href: string;
}

/**
 * Breadcrumb for every `/accounts/$accountId/*` page. Static segments are
 * translated from `SEGMENT_LABELS`; the account and application ids are
 * resolved to their titles.
 */
export function AccountBreadcrumb({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const segments = pathname.split("/").filter(Boolean);
  // ["accounts", accountId, ...rest]
  const rest = segments.slice(2);
  const applicationId =
    rest[0] === "applications" && rest[1] ? rest[1] : undefined;

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
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
    if (segment === applicationId) {
      crumbs.push({
        key: segment,
        label: applicationQuery.data?.item.title ?? t`Application`,
        href,
      });
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
