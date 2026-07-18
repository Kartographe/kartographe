// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "antd";
import type { components } from "@/api/generated/schema";
import { KpiCard } from "@/features/accounts/dashboard/kpi-card";
import {
  ACTIVITY_KEYS,
  ACTIVITY_LABEL,
  METRIC_GROUPS,
  METRIC_LABELS,
  type Typology,
} from "@/features/accounts/dashboard/metrics";

type StatsReport = components["schemas"]["StatsReport"];
type StatMetric = components["schemas"]["StatMetric"];
type StatBucket = components["schemas"]["StatBucket"];
type StatEntityKey = components["schemas"]["StatEntityKey"];
type ActivityMetric = Pick<
  StatMetric,
  "total" | "series" | "periodCount" | "delta"
>;

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
};

const SKELETON_KEYS = ["a", "b", "c", "d"];

/** Sum the entity-creation metrics into the synthetic overview "Activité" tile.
 * All metrics share the same granularity and period, so their buckets align by
 * index. */
function buildActivityMetric(
  byKey: Map<StatEntityKey, StatMetric>
): ActivityMetric {
  const parts = ACTIVITY_KEYS.map((key) => byKey.get(key)).filter(
    (metric): metric is StatMetric => metric !== undefined
  );

  const total = parts.reduce((acc, metric) => acc + metric.total, 0);
  const periodCount = parts.reduce(
    (acc, metric) => acc + metric.periodCount,
    0
  );
  const previousCount = parts.reduce(
    (acc, metric) => acc + metric.previousCount,
    0
  );
  const length = parts.reduce(
    (max, metric) => Math.max(max, metric.series.length),
    0
  );
  const series: StatBucket[] = Array.from({ length }, (_, index) => ({
    date:
      parts.find((metric) => metric.series[index])?.series[index]?.date ?? "",
    value: parts.reduce(
      (acc, metric) => acc + (metric.series[index]?.value ?? 0),
      0
    ),
  }));

  return {
    total,
    periodCount,
    series,
    delta:
      previousCount > 0 ? (periodCount - previousCount) / previousCount : null,
  };
}

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

  const byKey = new Map<StatEntityKey, StatMetric>(
    report.metrics.map((metric) => [metric.key, metric])
  );

  return (
    <div style={GRID_STYLE}>
      {typology === "overview" ? (
        <KpiCard
          label={t(ACTIVITY_LABEL)}
          metric={buildActivityMetric(byKey)}
        />
      ) : null}
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
