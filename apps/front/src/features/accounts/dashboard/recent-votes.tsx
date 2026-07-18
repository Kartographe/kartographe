// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  Avatar,
  Card,
  Empty,
  Flex,
  List,
  Segmented,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { entityLink } from "@/features/accounts/dashboard/entity-link";
import { ENTITY_TYPE_LABELS } from "@/features/accounts/dashboard/metrics";
import { ownerName } from "@/features/accounts/owner-cell";
import { CommentDate } from "@/features/comments/comment-date";
import {
  VOTE_VALUE_COLORS,
  VOTE_VALUE_ICONS,
  VOTE_VALUE_LABELS,
  VOTE_VALUE_ORDER,
} from "@/features/votes/labels";
import { cn } from "@/utils/classnames";

type EntityType = components["schemas"]["EntityType"];
type VoteValue = components["schemas"]["VoteValue"];
type Vote = components["schemas"]["VoteListItem"];

const RECENT_COUNT = 8;
const OWNER_SIZE = 22;
const ALL = "all";

/** One vote: the target entity (linked when it still exists), the voter, the
 * stance and the age. The whole block is the click target. */
function VoteRow({ vote, accountId }: { vote: Vote; accountId: string }) {
  const { t } = useLingui();
  const name = ownerName(vote.owner, t`Utilisateur`);
  const target = entityLink(accountId, vote.entity);
  const label = vote.entity?.label ?? t(ENTITY_TYPE_LABELS[vote.entityType]);

  const body = (
    <Flex align="center" gap={8} style={{ minWidth: 0, width: "100%" }}>
      <Tooltip title={name}>
        <Avatar size={OWNER_SIZE} src={vote.owner.pictureProfile ?? undefined}>
          {(name[0] ?? "?").toUpperCase()}
        </Avatar>
      </Tooltip>
      <Typography.Text
        ellipsis
        strong
        style={{ flex: 1, fontSize: 13, minWidth: 0 }}
      >
        {label}
      </Typography.Text>
      <Tag
        color="default"
        icon={VOTE_VALUE_ICONS[vote.value]}
        style={{ color: VOTE_VALUE_COLORS[vote.value], marginInlineEnd: 0 }}
      >
        {t(VOTE_VALUE_LABELS[vote.value])}
      </Tag>
      <CommentDate date={vote.date} />
    </Flex>
  );

  return (
    <List.Item style={{ paddingBlock: 6 }}>
      {target ? (
        <Link
          className={cn(
            "-mx-2 block w-full rounded-md px-2 py-1 text-inherit",
            "transition-colors hover:bg-(--ant-color-fill-tertiary)"
          )}
          params={target.params}
          to={target.to}
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </List.Item>
  );
}

/** The newest votes across the account, filterable by target kind. */
export function RecentVotes({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const [filter, setFilter] = useState<EntityType | typeof ALL>(ALL);
  const [valueFilter, setValueFilter] = useState<VoteValue | typeof ALL>(ALL);

  // Unfiltered stream — drives the Segmented options (which kinds have votes).
  const typesQuery = $api.useQuery("get", "/v1/accounts/{account_id}/votes", {
    params: {
      path: { account_id: accountId },
      query: { sortBy: "date", sortOrder: "desc" },
    },
  });

  const query = $api.useQuery("get", "/v1/accounts/{account_id}/votes", {
    params: {
      path: { account_id: accountId },
      query: {
        entityType: filter === ALL ? undefined : [filter],
        value: valueFilter === ALL ? undefined : [valueFilter],
        sortBy: "date",
        sortOrder: "desc",
      },
    },
  });

  const presentTypes = [
    ...new Set((typesQuery.data?.items ?? []).map((vote) => vote.entityType)),
  ];
  const filtered = (query.data?.items ?? []).slice(0, RECENT_COUNT);

  const entityOptions = [
    { label: t`Tous`, value: ALL },
    ...presentTypes.map((type) => ({
      label: t(ENTITY_TYPE_LABELS[type]),
      value: type,
    })),
  ];
  const valueOptions = [
    { label: t`Tous`, value: ALL },
    ...VOTE_VALUE_ORDER.map((value) => ({
      label: t(VOTE_VALUE_LABELS[value]),
      value,
    })),
  ];

  return (
    <Flex gap={12} vertical>
      <Flex align="center" gap={16} justify="space-between" wrap>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t`Derniers votes`}
        </Typography.Title>
        <Flex gap={8} wrap>
          <Segmented
            onChange={(value) =>
              setValueFilter(value as VoteValue | typeof ALL)
            }
            options={valueOptions}
            size="small"
            value={valueFilter}
          />
          {presentTypes.length > 1 ? (
            <Segmented
              onChange={(value) => setFilter(value as EntityType | typeof ALL)}
              options={entityOptions}
              size="small"
              value={filter}
            />
          ) : null}
        </Flex>
      </Flex>
      <Card size="small">
        <List
          dataSource={filtered}
          loading={query.isLoading}
          locale={{ emptyText: <Empty description={t`Aucun vote`} /> }}
          renderItem={(vote) => <VoteRow accountId={accountId} vote={vote} />}
          size="small"
        />
      </Card>
    </Flex>
  );
}
