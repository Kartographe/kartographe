import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { MigrationStatusTag } from "@/features/databases/database-tags";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/comments",
];

interface MigrationCommentsDrawerProps {
  accountId: string;
  databaseId: string;
  /** The drawer is open exactly when a migration is passed. */
  migration: DatabaseMigration | undefined;
  onClose: () => void;
}

export function MigrationCommentsDrawer({
  accountId,
  databaseId,
  migration,
  onClose,
}: MigrationCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_migration_id: migration?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/comments",
    { params: { path } },
    { enabled: !!migration }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/comments",
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
      open={!!migration}
      // The body owns the scroll internally (history scrolls, composer stays
      // pinned), so it must not scroll as a whole.
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        migration ? (
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <Typography.Text ellipsis strong>
              {migration.title}
            </Typography.Text>
            <MigrationStatusTag status={migration.status} />
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
