// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Card, Flex, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import { DeltaBadge } from "@/features/accounts/dashboard/delta-badge";
import { Sparkline } from "@/features/accounts/dashboard/sparkline";
import { formatInteger } from "@/lib/format/number";

type StatMetric = components["schemas"]["StatMetric"];

const SPARKLINE_WIDTH = 96;

/** One KPI tile: label, all-time total, a velocity sparkline, and the period
 * count with its delta against the previous window. */
export function KpiCard({
  label,
  metric,
}: {
  label: string;
  metric: StatMetric;
}) {
  const { t, i18n } = useLingui();

  return (
    <Card size="small">
      <Flex gap={8} vertical>
        <Typography.Text
          style={{
            fontSize: 12,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
          type="secondary"
        >
          {label}
        </Typography.Text>

        <Flex align="flex-end" gap={8} justify="space-between">
          <Typography.Title level={2} style={{ lineHeight: 1, margin: 0 }}>
            {formatInteger(metric.total, i18n.locale)}
          </Typography.Title>
          <div style={{ width: SPARKLINE_WIDTH }}>
            <Sparkline
              data={metric.series.map((bucket) => bucket.value)}
              label={t`Évolution sur la période`}
            />
          </div>
        </Flex>

        <Flex align="center" gap={8} justify="space-between">
          <Typography.Text style={{ fontSize: 12 }} type="secondary">
            {t`+${formatInteger(metric.periodCount, i18n.locale)} sur la période`}
          </Typography.Text>
          <DeltaBadge delta={metric.delta} />
        </Flex>
      </Flex>
    </Card>
  );
}
