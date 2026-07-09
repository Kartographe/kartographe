import { createFileRoute } from "@tanstack/react-router";
import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { TablesScreen } from "@/features/databases/tables/tables-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/tables"
)({
  component: TablesPage,
});

function TablesPage() {
  const { accountId, databaseId } = Route.useParams();
  // The screen needs the engine (to resolve column types), not just the id.
  const databaseQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { params: { path: { account_id: accountId, database_id: databaseId } } }
  );
  const database = databaseQuery.data?.item;

  if (!database) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return <TablesScreen accountId={accountId} database={database} />;
}
