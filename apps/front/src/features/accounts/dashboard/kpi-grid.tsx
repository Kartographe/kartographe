// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "antd";
import type { components } from "@/api/generated/schema";
import { KpiCard } from "@/features/accounts/dashboard/kpi-card";
import {
  METRIC_GROUPS,
  METRIC_LABELS,
  type Typology,
} from "@/features/accounts/dashboard/metrics";

type StatsReport = components["schemas"]["StatsReport"];
type StatEntityKey = components["schemas"]["StatEntityKey"];

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
};

const SKELETON_KEYS = ["a", "b", "c", "d"];

/** The KPI tiles for the active typology, sourced from a single `/stats` call. */
export function KpiGrid({
  report,
  typology,
  loading,
}: {
  report: StatsReport | undefined;
  typology: Typology;
  loading: boolean;
}) {
  const { t } = useLingui();
  const keys = METRIC_GROUPS[typology];

  if (loading || !report) {
    return (
      <div style={GRID_STYLE}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton active key={key} paragraph={{ rows: 2 }} title />
        ))}
      </div>
    );
  }

  const byKey = new Map<StatEntityKey, StatsReport["metrics"][number]>(
    report.metrics.map((metric) => [metric.key, metric])
  );

  return (
    <div style={GRID_STYLE}>
      {keys.map((key) => {
        const metric = byKey.get(key);
        if (!metric) {
          return null;
        }
        return (
          <KpiCard key={key} label={t(METRIC_LABELS[key])} metric={metric} />
        );
      })}
    </div>
  );
}
