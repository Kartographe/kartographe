// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Card, Empty, Flex, List, Typography } from "antd";
import { $api } from "@/api/$api";
import { EntityRefLabel } from "@/features/accounts/dashboard/entity-ref-label";
import { OwnerCell } from "@/features/accounts/owner-cell";
import { CommentDate } from "@/features/comments/comment-date";
import { richTextToPlainText } from "@/lib/rich-text/rich-text";

const RECENT_COUNT = 6;
const OWNER_SIZE = 20;
const PREVIEW_ROWS = 2;

/** The newest published comments across the account, as a compact feed. */
export function RecentComments({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/comments", {
    params: {
      path: { account_id: accountId },
      query: { status: ["published"], sortBy: "date", sortOrder: "desc" },
    },
  });
  const comments = (query.data?.items ?? []).slice(0, RECENT_COUNT);

  return (
    <Card size="small" title={t`Derniers commentaires`}>
      <List
        dataSource={comments}
        loading={query.isLoading}
        locale={{ emptyText: <Empty description={t`Aucun commentaire`} /> }}
        renderItem={(comment) => {
          const preview = richTextToPlainText(comment.value);
          return (
            <List.Item>
              <Flex gap={4} style={{ minWidth: 0, width: "100%" }} vertical>
                <Flex align="center" gap={8} justify="space-between">
                  <OwnerCell owner={comment.owner} size={OWNER_SIZE} />
                  <CommentDate date={comment.date} />
                </Flex>
                <Typography.Paragraph
                  ellipsis={{ rows: PREVIEW_ROWS }}
                  style={{ fontSize: 13, margin: 0 }}
                  type={preview ? undefined : "secondary"}
                >
                  {preview || t`(commentaire vide)`}
                </Typography.Paragraph>
                <EntityRefLabel
                  entity={comment.entity}
                  entityType={comment.entityType}
                />
              </Flex>
            </List.Item>
          );
        }}
        size="small"
      />
    </Card>
  );
}
