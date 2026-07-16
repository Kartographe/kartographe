// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { TableTypeTag } from "@/features/databases/database-tags";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/comments",
];

interface TableCommentsDrawerProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  /** The drawer is open exactly when a table is passed. */
  table: DatabaseTable | undefined;
  onClose: () => void;
}

export function TableCommentsDrawer({
  accountId,
  databaseId,
  versionId,
  table,
  onClose,
}: TableCommentsDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: table?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/comments",
    { params: { path } },
    { enabled: !!table }
  );
  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/comments",
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
      open={!!table}
      // The body owns the scroll internally (history scrolls, composer stays
      // pinned), so it must not scroll as a whole.
      styles={{
        body: { display: "flex", flexDirection: "column", overflow: "hidden" },
      }}
      title={
        table ? (
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <Typography.Text code ellipsis>
              {`${table.schema}.${table.name}`}
            </Typography.Text>
            <TableTypeTag type={table.type} />
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
