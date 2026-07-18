// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Flex, Tooltip, Typography } from "antd";
import { formatSignedPercent } from "@/lib/format/number";

/**
 * The period-over-period change, as a coloured arrow + signed percentage. For
 * these metrics more is better, so up reads green and down red — always with an
 * arrow, never colour alone. A null delta (no prior baseline) shows a neutral
 * dash.
 */
export function DeltaBadge({ delta }: { delta: number | null | undefined }) {
  const { t, i18n } = useLingui();

  if (delta === null || delta === undefined) {
    return (
      <Tooltip title={t`Aucune donnée sur la période précédente`}>
        <Typography.Text style={{ fontSize: 12 }} type="secondary">
          {t`—`}
        </Typography.Text>
      </Tooltip>
    );
  }

  if (delta === 0) {
    return (
      <Typography.Text style={{ fontSize: 12 }} type="secondary">
        {formatSignedPercent(0, i18n.locale)}
      </Typography.Text>
    );
  }

  const up = delta > 0;
  const color = up ? "var(--ant-color-success)" : "var(--ant-color-error)";

  return (
    <Tooltip title={t`Comparé à la période précédente`}>
      <Flex align="center" gap={2} style={{ color, fontSize: 12 }}>
        {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        <span>{formatSignedPercent(delta, i18n.locale)}</span>
      </Flex>
    </Tooltip>
  );
}
