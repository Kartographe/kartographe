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
import { richTextToPlainText } from "@/lib/rich-text/rich-text";
import { cn } from "@/utils/classnames";

type EntityType = components["schemas"]["EntityType"];
type CommentItem = components["schemas"]["CommentListItem"];

const RECENT_COUNT = 8;
const OWNER_SIZE = 22;
const PREVIEW_ROWS = 2;
const ALL = "all";

/** One comment: the target entity's title (linked, when it still exists), its
 * author (name on hover) and age, then the content preview. The whole block is
 * the click target. */
function CommentRow({
  comment,
  accountId,
}: {
  comment: CommentItem;
  accountId: string;
}) {
  const { t } = useLingui();
  const name = ownerName(comment.owner, t`Utilisateur`);
  const preview = richTextToPlainText(comment.value);
  const target = entityLink(accountId, comment.entity);
  const label =
    comment.entity?.label ?? t(ENTITY_TYPE_LABELS[comment.entityType]);

  const body = (
    <Flex gap={4} style={{ minWidth: 0, width: "100%" }} vertical>
      <Flex align="center" gap={8} style={{ minWidth: 0 }}>
        <Tooltip title={name}>
          <Avatar
            size={OWNER_SIZE}
            src={comment.owner.pictureProfile ?? undefined}
          >
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
        <CommentDate date={comment.date} />
      </Flex>
      <Typography.Paragraph
        ellipsis={{ rows: PREVIEW_ROWS }}
        style={{ fontSize: 13, margin: 0 }}
        type={preview ? undefined : "secondary"}
      >
        {preview || t`(commentaire vide)`}
      </Typography.Paragraph>
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

/** The newest published comments across the account, filterable by target kind. */
export function RecentComments({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const [filter, setFilter] = useState<EntityType | typeof ALL>(ALL);

  // Unfiltered stream — drives the Segmented options (which kinds have comments).
  const typesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/comments",
    {
      params: {
        path: { account_id: accountId },
        query: { status: ["published"], sortBy: "date", sortOrder: "desc" },
      },
    }
  );

  // The displayed list — filtered by kind server-side (deduped with the query
  // above when the filter is "all", same query key).
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/comments", {
    params: {
      path: { account_id: accountId },
      query: {
        status: ["published"],
        entityType: filter === ALL ? undefined : [filter],
        sortBy: "date",
        sortOrder: "desc",
      },
    },
  });

  const presentTypes = [
    ...new Set(
      (typesQuery.data?.items ?? []).map((comment) => comment.entityType)
    ),
  ];
  const filtered = (query.data?.items ?? []).slice(0, RECENT_COUNT);

  const options = [
    { label: t`Tous`, value: ALL },
    ...presentTypes.map((type) => ({
      label: t(ENTITY_TYPE_LABELS[type]),
      value: type,
    })),
  ];

  return (
    <Flex gap={12} vertical>
      {presentTypes.length > 1 ? (
        <Segmented
          onChange={(value) => setFilter(value as EntityType | typeof ALL)}
          options={options}
          size="small"
          value={filter}
        />
      ) : null}
      <Card size="small" title={t`Derniers commentaires`}>
        <List
          dataSource={filtered}
          loading={query.isLoading}
          locale={{ emptyText: <Empty description={t`Aucun commentaire`} /> }}
          renderItem={(comment) => (
            <CommentRow accountId={accountId} comment={comment} />
          )}
          size="small"
        />
      </Card>
    </Flex>
  );
}
