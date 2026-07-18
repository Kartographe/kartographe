// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Empty,
  Flex,
  List,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { ownerName } from "@/features/accounts/owner-cell";
import { VoteRoleTag } from "@/features/accounts/vote-role-tag";
import { CommentAvatar } from "@/features/comments/comment-avatar";
import {
  VOTE_VALUE_COLORS,
  VOTE_VALUE_ICONS,
  VOTE_VALUE_LABELS,
  VOTE_VALUE_ORDER,
} from "@/features/votes/labels";
import { VotesCell } from "@/features/votes/votes-cell";

type EntityType = components["schemas"]["EntityType"];
type VoteValue = components["schemas"]["VoteValue"];
type Vote = components["schemas"]["VoteListItem"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/votes"];

interface VotesPanelProps {
  accountId: string;
  entityType: EntityType;
  entityId: string;
}

/**
 * Every member's vote on one entity, plus the caller's own vote picker. Reads
 * the mutualized `/votes` listing filtered to this entity, and casts through the
 * mutualized `/votes` endpoint — one GET + one POST, whatever the entity type.
 */
export function VotesPanel({
  accountId,
  entityType,
  entityId,
}: VotesPanelProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const me = $api.useQuery("get", "/me").data?.item;

  const votesQuery = $api.useQuery("get", "/v1/accounts/{account_id}/votes", {
    params: {
      path: { account_id: accountId },
      query: { entityType: [entityType], entityId: [entityId] },
    },
  });
  const castMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/votes",
    {
      meta: { successMessage: t`Vote enregistré` },
    }
  );

  const votes = votesQuery.data?.items ?? [];
  const myVote = votes.find((vote) => vote.ownerId === me?.id);

  const countsByValue: Partial<Record<VoteValue, number>> = {};
  const countsByRoleValue: Record<
    string,
    Partial<Record<VoteValue, number>>
  > = {};
  for (const vote of votes) {
    countsByValue[vote.value] = (countsByValue[vote.value] ?? 0) + 1;
    const roleTally = countsByRoleValue[vote.role] ?? {};
    countsByRoleValue[vote.role] = roleTally;
    roleTally[vote.value] = (roleTally[vote.value] ?? 0) + 1;
  }

  function renderVotes() {
    if (votesQuery.isLoading) {
      return <Skeleton active paragraph={{ rows: 4 }} title={false} />;
    }
    if (votes.length === 0) {
      return (
        <Empty
          description={t`Personne n'a encore voté.`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    return (
      <List
        dataSource={votes}
        renderItem={(vote: Vote) => (
          <List.Item key={vote.id}>
            <List.Item.Meta
              avatar={<CommentAvatar user={vote.owner} />}
              description={<VoteRoleTag voteRole={vote.role} />}
              title={ownerName(vote.owner, t`Membre`)}
            />
            <Tag
              color="default"
              icon={VOTE_VALUE_ICONS[vote.value]}
              style={{
                color: VOTE_VALUE_COLORS[vote.value],
                marginInlineEnd: 0,
              }}
            >
              {t(VOTE_VALUE_LABELS[vote.value])}
            </Tag>
          </List.Item>
        )}
      />
    );
  }

  async function cast(value: VoteValue) {
    await castMutation.mutateAsync({
      params: { path: { account_id: accountId } },
      body: { entityType, entityId, value },
    });
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  return (
    <Flex gap={20} vertical>
      <Flex align="center" gap={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Votes`}
        </Typography.Title>
        {votes.length > 0 ? (
          <Badge
            color="var(--ant-color-fill-secondary)"
            count={votes.length}
            style={{ color: "var(--ant-color-text)" }}
          />
        ) : null}
      </Flex>

      <Flex
        gap={12}
        style={{
          background: "var(--ant-color-fill-quaternary)",
          borderRadius: 10,
          padding: 16,
        }}
        vertical
      >
        <Typography.Text strong>{t`Votre vote`}</Typography.Text>
        <Flex gap={8} wrap>
          {VOTE_VALUE_ORDER.map((value) => {
            const active = myVote?.value === value;
            return (
              <Button
                icon={
                  <span
                    style={{
                      color: active ? undefined : VOTE_VALUE_COLORS[value],
                    }}
                  >
                    {VOTE_VALUE_ICONS[value]}
                  </span>
                }
                key={value}
                loading={castMutation.isPending}
                onClick={() => cast(value)}
                type={active ? "primary" : "default"}
              >
                {t(VOTE_VALUE_LABELS[value])}
              </Button>
            );
          })}
        </Flex>
        {votes.length > 0 ? (
          <Flex align="center" gap={8}>
            <Typography.Text type="secondary">{t`Répartition`}</Typography.Text>
            <VotesCell
              countsByRoleValue={countsByRoleValue}
              countsByValue={countsByValue}
              myVote={myVote?.value}
            />
          </Flex>
        ) : null}
      </Flex>

      {renderVotes()}
    </Flex>
  );
}
