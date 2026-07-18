// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Flex, Tooltip, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import { VOTE_ROLE_LABELS } from "@/features/accounts/labels";
import {
  VOTE_ROLE_ICONS,
  VOTE_ROLE_LETTERS,
  VOTE_ROLE_ORDER,
  VOTE_VALUE_COLORS,
  VOTE_VALUE_ICONS,
  VOTE_VALUE_LABELS,
  VOTE_VALUE_ORDER,
} from "@/features/votes/labels";

type VoteValue = components["schemas"]["VoteValue"];
type VoteRole = components["schemas"]["VoteRole"];
type CountsByValue = Partial<Record<VoteValue, number>>;
type CountsByRoleValue = Partial<Record<VoteRole, CountsByValue>>;

interface VotesCellProps {
  countsByValue: CountsByValue;
  countsByRoleValue: CountsByRoleValue;
  myVote?: VoteValue | null;
}

function sum(counts: CountsByValue): number {
  return VOTE_VALUE_ORDER.reduce(
    (total, value) => total + (counts[value] ?? 0),
    0
  );
}

/** The stance that carries the role's cell colour: its most-cast value. */
function dominantValue(counts: CountsByValue): VoteValue {
  return VOTE_VALUE_ORDER.reduce((best, value) =>
    (counts[value] ?? 0) > (counts[best] ?? 0) ? value : best
  );
}

/**
 * Compact vote summary for a listing row: the total, the caller's own stance
 * (when they voted), and one chip per role that voted — its icon + letter +
 * count, tinted by the role's dominant stance, with the ↑/↓ breakdown on hover.
 */
export function VotesCell({
  countsByValue,
  countsByRoleValue,
  myVote,
}: VotesCellProps) {
  const { t } = useLingui();
  const total = sum(countsByValue);

  if (total === 0 && !myVote) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  return (
    <Flex align="center" gap={8} wrap>
      {myVote ? (
        <Tooltip title={t`Votre vote : ${t(VOTE_VALUE_LABELS[myVote])}`}>
          <span
            style={{
              alignItems: "center",
              borderRadius: 999,
              color: VOTE_VALUE_COLORS[myVote],
              display: "inline-flex",
              outline: "1px solid var(--ant-color-border)",
              padding: "1px 5px",
            }}
          >
            {VOTE_VALUE_ICONS[myVote]}
          </span>
        </Tooltip>
      ) : null}

      <Typography.Text strong style={{ fontVariantNumeric: "tabular-nums" }}>
        Σ{total}
      </Typography.Text>

      {VOTE_ROLE_ORDER.map((role) => {
        const counts = countsByRoleValue[role];
        const roleTotal = counts ? sum(counts) : 0;
        if (!counts || roleTotal === 0) {
          return null;
        }
        const color = VOTE_VALUE_COLORS[dominantValue(counts)];
        const breakdown = VOTE_VALUE_ORDER.filter(
          (value) => (counts[value] ?? 0) > 0
        );
        return (
          <Tooltip
            key={role}
            title={
              <Flex gap={4} vertical>
                <span>{t(VOTE_ROLE_LABELS[role])}</span>
                <Flex gap={8}>
                  {breakdown.map((value) => (
                    <span
                      key={value}
                      style={{ color: VOTE_VALUE_COLORS[value] }}
                    >
                      {VOTE_VALUE_ICONS[value]} {counts[value]}
                    </span>
                  ))}
                </Flex>
              </Flex>
            }
          >
            <span
              style={{
                alignItems: "center",
                color,
                display: "inline-flex",
                fontVariantNumeric: "tabular-nums",
                gap: 2,
              }}
            >
              {VOTE_ROLE_ICONS[role]}
              <b>{VOTE_ROLE_LETTERS[role]}</b>
              {roleTotal}
            </span>
          </Tooltip>
        );
      })}
    </Flex>
  );
}
