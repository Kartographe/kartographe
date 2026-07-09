import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { TablesScreen } from "@/features/databases/tables/tables-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/versions/$versionId"
)({
  component: VersionTablesPage,
});

function VersionTablesPage() {
  const { t } = useLingui();
  const { accountId, databaseId, versionId } = Route.useParams();

  // The screen needs the engine (to resolve column types) and the version it
  // is describing, not just their ids.
  const databaseQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { params: { path: { account_id: accountId, database_id: databaseId } } }
  );
  const versionQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId,
          database_version_id: versionId,
        },
      },
    }
  );

  if (versionQuery.isError) {
    return (
      <Result
        extra={
          <Link
            params={{ accountId, databaseId }}
            to="/accounts/$accountId/databases/$databaseId/versions"
          >
            <Button type="primary">{t`Retour aux versions`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Cette version n'existe pas ou n'est plus accessible.`}
        title={t`Version introuvable`}
      />
    );
  }

  const database = databaseQuery.data?.item;
  const version = versionQuery.data?.item;

  if (!(database && version)) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <TablesScreen accountId={accountId} database={database} version={version} />
  );
}
