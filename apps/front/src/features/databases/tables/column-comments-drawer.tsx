// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { invalidateEntityQueries } from "@/features/entities/invalidate-entity";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type Column = components["schemas"]["DatabaseTableColumnItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/comments",
];

interface ColumnCommentsDrawerProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  tableId: string;
  /** Qualified name of the owning table, shown above the column. */
  tableName: string;
  /** The drawer is open exactly when a column is passed. */
  column: Column | undefined;
  onClose: () => void;
}

export function ColumnCommentsDrawer({
  accountId,
  databaseId,
  versionId,
  tableId,
  tableName,
  column,
  onClose,
}: ColumnCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: tableId,
    database_table_column_id: column?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/comments",
    { params: { path } },
    { enabled: !!column }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/comments",
    { meta: { successMessage: t`Commentaire publié` } }
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    invalidateEntityQueries(queryClient, "database_table_column");
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
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        column ? (
          <Flex align="center" gap={8} style={{ minWidth: 0 }}>
            <Typography.Text ellipsis type="secondary">
              {tableName}
            </Typography.Text>
            <Typography.Text code ellipsis>
              {column.name}
            </Typography.Text>
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
