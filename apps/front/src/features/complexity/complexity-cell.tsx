// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { TeamOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Flex, Tag, Tooltip, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import {
  COMPLEXITY_LEVEL_COLORS,
  COMPLEXITY_LEVEL_LABELS,
  COMPLEXITY_MODE_LABELS,
} from "@/features/complexity/labels";

type Stats = components["schemas"]["ComplexityStatsItem"];
type Mine = components["schemas"]["MyComplexityItem"];

/** The API renders decimals as strings ("8.00", "0.50"); show them as cards. */
function formatValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "?";
  }
  return String(Number(value));
}

interface ComplexityCellProps {
  complexity?: Stats | null;
  myComplexity?: Mine | null;
}

/**
 * Compact estimate summary for a listing row: the weight as a coloured chip,
 * the average, and how many members put a number down — with the median, the
 * scale and the caller's own answer on hover.
 *
 * The chip carries the weight rather than the raw average because the number
 * only means something next to its scale, which the row has no space for.
 */
export function ComplexityCell({
  complexity,
  myComplexity,
}: ComplexityCellProps) {
  const { t } = useLingui();

  if (!complexity || complexity.count === 0) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  const { average, count, level, median, mode } = complexity;
  const scale = t(COMPLEXITY_MODE_LABELS[mode]);
  const tooltip = [
    `${t`Moyenne`} ${formatValue(average)}`,
    `${t`Médiane`} ${formatValue(median)}`,
    `${t`Échelle`} ${scale}`,
    myComplexity
      ? `${t`Votre estimation`} ${formatValue(myComplexity.value)}`
      : t`Vous n'avez pas estimé`,
  ].join(" · ");

  return (
    <Tooltip title={tooltip}>
      <Flex align="center" gap={6}>
        {level ? (
          <Tag
            color={COMPLEXITY_LEVEL_COLORS[level]}
            style={{ marginInlineEnd: 0 }}
          >
            {t(COMPLEXITY_LEVEL_LABELS[level])}
          </Tag>
        ) : (
          // Everyone answered "cannot estimate": there is a tally, but no weight.
          <Tag style={{ marginInlineEnd: 0 }}>?</Tag>
        )}
        <Typography.Text
          strong={!!myComplexity}
          style={{ fontSize: 12 }}
          type={myComplexity ? undefined : "secondary"}
        >
          {formatValue(average)}
        </Typography.Text>
        <Flex align="center" gap={2}>
          <TeamOutlined style={{ color: "var(--ant-color-text-tertiary)" }} />
          <Typography.Text style={{ fontSize: 12 }} type="secondary">
            {count}
          </Typography.Text>
        </Flex>
      </Flex>
    </Tooltip>
  );
}
