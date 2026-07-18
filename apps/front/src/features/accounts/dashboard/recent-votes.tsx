// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  DislikeOutlined,
  LikeOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Card, Empty, Flex, List, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { EntityRefLabel } from "@/features/accounts/dashboard/entity-ref-label";
import { OwnerCell } from "@/features/accounts/owner-cell";
import { CommentDate } from "@/features/comments/comment-date";

type VoteValue = components["schemas"]["VoteValue"];

const RECENT_COUNT = 6;
const OWNER_SIZE = 20;

const VOTE_META: Record<
  VoteValue,
  { label: MessageDescriptor; color: string; icon: ReactNode }
> = {
  upvote: { label: msg`Pour`, color: "success", icon: <LikeOutlined /> },
  downvote: { label: msg`Contre`, color: "error", icon: <DislikeOutlined /> },
  pending_question: {
    label: msg`Question`,
    color: "warning",
    icon: <QuestionCircleOutlined />,
  },
  dont_know: {
    label: msg`Ne sait pas`,
    color: "default",
    icon: <MinusCircleOutlined />,
  },
};

/** The newest votes across the account, as a compact feed. */
export function RecentVotes({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/votes", {
    params: {
      path: { account_id: accountId },
      query: { sortBy: "date", sortOrder: "desc" },
    },
  });
  const votes = (query.data?.items ?? []).slice(0, RECENT_COUNT);

  return (
    <Card size="small" title={t`Derniers votes`}>
      <List
        dataSource={votes}
        loading={query.isLoading}
        locale={{ emptyText: <Empty description={t`Aucun vote`} /> }}
        renderItem={(vote) => {
          const meta = VOTE_META[vote.value];
          return (
            <List.Item>
              <Flex gap={4} style={{ minWidth: 0, width: "100%" }} vertical>
                <Flex align="center" gap={8} justify="space-between">
                  <OwnerCell owner={vote.owner} size={OWNER_SIZE} />
                  <Tag color={meta.color} icon={meta.icon}>
                    {t(meta.label)}
                  </Tag>
                </Flex>
                <Flex align="center" gap={8} justify="space-between">
                  <EntityRefLabel
                    entity={vote.entity}
                    entityType={vote.entityType}
                  />
                  <Typography.Text style={{ whiteSpace: "nowrap" }}>
                    <CommentDate date={vote.date} />
                  </Typography.Text>
                </Flex>
              </Flex>
            </List.Item>
          );
        }}
        size="small"
      />
    </Card>
  );
}
