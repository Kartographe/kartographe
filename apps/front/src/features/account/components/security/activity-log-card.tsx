// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import type { TableProps } from "antd";
import { Card, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { COL, scrollX } from "@/components/table/columns";

type SecurityLog = components["schemas"]["SecurityLogItem"];

const STATUS_COLOR: Record<string, string> = {
  success: "green",
  error: "red",
  forbidden: "orange",
};

export function ActivityLogCard() {
  const { t } = useLingui();
  const logsQuery = $api.useQuery("get", "/me/security/logs");
  const rows = logsQuery.data?.items ?? [];

  const columns: TableProps<SecurityLog>["columns"] = [
    {
      title: t`Date`,
      dataIndex: "date",
      width: COL.datetime,
      ellipsis: true,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—",
    },
    {
      title: t`Événement`,
      dataIndex: "type",
      width: COL.type,
      ellipsis: true,
    },
    {
      title: t`Statut`,
      dataIndex: "status",
      width: COL.status,
      render: (value: string) => <Tag color={STATUS_COLOR[value]}>{value}</Tag>,
    },
    {
      title: t`IP`,
      dataIndex: "ip",
      width: COL.text,
      ellipsis: true,
      render: (value: string) => value ?? "—",
    },
  ];

  return (
    <Card
      title={<Typography.Text strong>{t`Activité récente`}</Typography.Text>}
    >
      <Table<SecurityLog>
        columns={columns}
        dataSource={rows}
        loading={logsQuery.isLoading}
        pagination={false}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />
    </Card>
  );
}
