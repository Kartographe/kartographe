// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Card, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { $api } from "@/api/$api";

const STATUS_COLOR: Record<string, string> = {
  success: "green",
  error: "red",
  forbidden: "orange",
};

export function ActivityLogCard() {
  const { t } = useLingui();
  const logsQuery = $api.useQuery("get", "/me/security/logs");
  const rows = logsQuery.data?.items ?? [];

  return (
    <Card
      title={<Typography.Text strong>{t`Activité récente`}</Typography.Text>}
    >
      <Table
        columns={[
          {
            title: t`Date`,
            dataIndex: "date",
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—",
          },
          { title: t`Événement`, dataIndex: "type" },
          {
            title: t`Statut`,
            dataIndex: "status",
            render: (value: string) => (
              <Tag color={STATUS_COLOR[value]}>{value}</Tag>
            ),
          },
          {
            title: t`IP`,
            dataIndex: "ip",
            render: (value: string) => value ?? "—",
          },
        ]}
        dataSource={rows}
        loading={logsQuery.isLoading}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </Card>
  );
}
