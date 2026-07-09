import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { MigrationColumnTypeTag } from "@/features/databases/database-tags";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type MigrationColumn = components["schemas"]["DatabaseMigrationColumnItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/comments",
];

interface MigrationColumnCommentsDrawerProps {
  accountId: string;
  databaseId: string;
  migrationId: string;
  /** The drawer is open exactly when a step is passed. */
  column: MigrationColumn | undefined;
  /** The step's endpoints, already resolved to names by the screen. */
  label: string;
  onClose: () => void;
}

export function MigrationColumnCommentsDrawer({
  accountId,
  databaseId,
  migrationId,
  column,
  label,
  onClose,
}: MigrationColumnCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_migration_id: migrationId,
    database_migration_column_id: column?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/comments",
    { params: { path } },
    { enabled: !!column }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/comments",
    { meta: { successMessage: t`Commentaire publié` } }
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function publish(value: RichTextDocument) {
    await createMutation.mutateAsync({ params: { path }, body: { value } });
    invalidate();
  }

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={!!column}
      // The body owns the scroll internally (history scrolls, composer stays
      // pinned), so it must not scroll as a whole.
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        column ? (
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <Typography.Text code ellipsis>
              {label}
            </Typography.Text>
            <MigrationColumnTypeTag type={column.type} />
          </Flex>
        ) : (
          t`Commentaires`
        )
      }
      width={520}
    >
      <CommentsFeed
        accountId={accountId}
        comments={commentsQuery.data?.items ?? []}
        fillHeight
        isLoading={commentsQuery.isLoading}
        isPublishing={createMutation.isPending}
        onChanged={invalidate}
        onPublish={publish}
      />
    </Drawer>
  );
}
