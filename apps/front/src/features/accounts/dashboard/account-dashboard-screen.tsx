// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Alert, Col, DatePicker, Flex, Row, Segmented, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import { KpiGrid } from "@/features/accounts/dashboard/kpi-grid";
import {
  TYPOLOGY_LABELS,
  type Typology,
} from "@/features/accounts/dashboard/metrics";
import {
  defaultPeriod,
  PERIOD_PRESETS,
  type Period,
} from "@/features/accounts/dashboard/period";
import { RecentComments } from "@/features/accounts/dashboard/recent-comments";
import { RecentEntities } from "@/features/accounts/dashboard/recent-entities";
import { RecentVotes } from "@/features/accounts/dashboard/recent-votes";

const { RangePicker } = DatePicker;

const TYPOLOGY_ORDER: Typology[] = ["overview", "produit", "technique"];
const SIDE_GAP = 16;

export function AccountDashboardScreen({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const [typology, setTypology] = useState<Typology>("overview");
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const statsQuery = $api.useQuery("get", "/v1/accounts/{account_id}/stats", {
    params: {
      path: { account_id: accountId },
      query: {
        lbound: period.start.toISOString(),
        ubound: period.end.toISOString(),
      },
    },
  });

  const account = accountQuery.data?.item;
  const presets = PERIOD_PRESETS.map((preset) => ({
    label: t(preset.label),
    value: preset.value(),
  }));

  return (
    <Flex gap={24} vertical>
      <Flex align="flex-start" gap={16} justify="space-between" wrap>
        <Flex gap={12} vertical>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {account?.name ?? t`Tableau de bord`}
          </Typography.Title>
          <Segmented<Typology>
            onChange={setTypology}
            options={TYPOLOGY_ORDER.map((value) => ({
              value,
              label: t(TYPOLOGY_LABELS[value]),
            }))}
            value={typology}
          />
        </Flex>
        <RangePicker
          allowClear={false}
          format="DD/MM/YYYY"
          onChange={(dates) => {
            if (dates?.[0] && dates[1]) {
              setPeriod({
                start: dates[0].startOf("day"),
                end: dates[1].endOf("day"),
              });
            }
          }}
          presets={presets}
          value={[period.start, period.end]}
        />
      </Flex>

      {statsQuery.isError ? (
        <Alert
          message={t`Impossible de charger les statistiques du compte.`}
          showIcon
          type="error"
        />
      ) : null}

      <KpiGrid
        loading={statsQuery.isLoading}
        report={statsQuery.data?.item}
        typology={typology}
      />

      <Row gutter={[SIDE_GAP, SIDE_GAP]}>
        <Col lg={12} xs={24}>
          <RecentEntities accountId={accountId} />
        </Col>
        <Col lg={12} xs={24}>
          <Flex gap={SIDE_GAP} vertical>
            <RecentComments accountId={accountId} />
            <RecentVotes accountId={accountId} />
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
}
