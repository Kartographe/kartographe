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
import { CommentAvatar } from "@/features/comments/comment-avatar";
import {
  COMPLEXITY_MODE_LABELS,
  COMPLEXITY_SCOPE_BY_ENTITY,
} from "@/features/complexity/labels";

type EntityType = components["schemas"]["EntityType"];
type Complexity = components["schemas"]["ComplexityListItem"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/complexities"];

/** The card standing for "no estimate yet" — the API accepts `null` on every scale. */
const NO_ESTIMATE = "null";

/** The API renders decimals as strings ("8.00", "0.50") — show them as cards. */
function formatValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "?";
  }
  // 0.5 must read as "0.5" and 8 as "8", not "8.00".
  return String(Number(value));
}

interface ComplexityPanelProps {
  accountId: string;
  entityType: EntityType;
  entityId: string;
}

/**
 * Every member's complexity estimate on one entity, plus the caller's own
 * picker. Reads the mutualized `/complexities` listing filtered to this entity
 * and posts through the mutualized endpoint — one GET + one POST whatever the
 * entity type. The cards offered come from the account's scale for that kind of
 * entity (`/complexities/scales`), never from a hardcoded list.
 */
export function ComplexityPanel({
  accountId,
  entityType,
  entityId,
}: ComplexityPanelProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const me = $api.useQuery("get", "/me").data?.item;

  const scalesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/complexities/scales",
    { params: { path: { account_id: accountId } } }
  );
  const estimatesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/complexities",
    {
      params: {
        path: { account_id: accountId },
        query: { entityType: [entityType], entityId: [entityId] },
      },
    }
  );
  const castMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/complexities",
    { meta: { successMessage: t`Estimation enregistrée` } }
  );
  const withdrawMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/complexities",
    { meta: { successMessage: t`Estimation retirée` } }
  );

  const estimates = estimatesQuery.data?.items ?? [];
  const mine = estimates.find((estimate) => estimate.ownerId === me?.id);
  // Both scales come back; the entity's family decides which one applies —
  // known up front, so the picker is right even before anyone has estimated.
  const scope = COMPLEXITY_SCOPE_BY_ENTITY[entityType];
  const scale = (scalesQuery.data?.items ?? []).find(
    (entry) => entry.scope === scope
  );

  /**
   * Clicking a card estimates; clicking the one already selected withdraws.
   * Withdrawing differs from picking "?" — that one answers "I cannot estimate
   * yet" and keeps you among the participants.
   */
  async function estimate(value: string | null, active: boolean) {
    if (active) {
      await withdrawMutation.mutateAsync({
        params: {
          path: { account_id: accountId },
          query: { entityType, entityId },
        },
      });
    } else {
      await castMutation.mutateAsync({
        params: { path: { account_id: accountId } },
        body: { entityType, entityId, value },
      });
    }
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function renderEstimates() {
    if (estimatesQuery.isLoading) {
      return <Skeleton active paragraph={{ rows: 3 }} title={false} />;
    }
    if (estimates.length === 0) {
      return (
        <Empty
          description={t`Personne n'a encore estimé.`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    return (
      <List
        dataSource={estimates}
        renderItem={(item: Complexity) => (
          <List.Item key={item.id}>
            <List.Item.Meta
              avatar={<CommentAvatar user={item.owner} />}
              description={t(COMPLEXITY_MODE_LABELS[item.mode])}
              title={ownerName(item.owner, t`Membre`)}
            />
            <Tag style={{ marginInlineEnd: 0 }}>{formatValue(item.value)}</Tag>
          </List.Item>
        )}
      />
    );
  }

  const cards: { key: string; label: string; value: string | null }[] = [
    // Sent back verbatim: the scale's own string keeps the value exact, where a
    // float round-trip would not.
    ...(scale?.values ?? []).map((value) => ({
      key: value,
      label: formatValue(value),
      value,
    })),
    { key: NO_ESTIMATE, label: "?", value: null },
  ];

  return (
    <Flex gap={20} vertical>
      <Flex align="center" gap={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Complexité`}
        </Typography.Title>
        {estimates.length > 0 ? (
          <Badge
            color="var(--ant-color-fill-secondary)"
            count={estimates.length}
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
        <Typography.Text strong>{t`Votre estimation`}</Typography.Text>
        {mine ? (
          <Typography.Text type="secondary">
            {t`Cliquez à nouveau sur votre carte pour retirer votre estimation.`}
          </Typography.Text>
        ) : null}
        {scalesQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 1 }} title={false} />
        ) : (
          <Flex gap={8} wrap>
            {cards.map((card) => {
              const active =
                mine !== undefined &&
                (card.value === null
                  ? mine.value === null
                  : Number(mine.value) === Number(card.value));
              return (
                <Button
                  key={card.key}
                  loading={castMutation.isPending || withdrawMutation.isPending}
                  onClick={() => estimate(card.value, active)}
                  title={active ? t`Retirer mon estimation` : undefined}
                  type={active ? "primary" : "default"}
                >
                  {card.label}
                </Button>
              );
            })}
          </Flex>
        )}
        {scale ? (
          <Typography.Text type="secondary">
            {t`Échelle ${t(COMPLEXITY_MODE_LABELS[scale.mode])}`}
          </Typography.Text>
        ) : null}
      </Flex>

      {renderEstimates()}
    </Flex>
  );
}
