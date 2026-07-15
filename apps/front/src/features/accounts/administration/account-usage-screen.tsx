import { useLingui } from "@lingui/react/macro";
import { Alert, Flex, Progress, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  USAGE_ENTITY_LABELS,
  USAGE_GROUP_LABELS,
} from "@/features/accounts/administration/usage-labels";
import { formatFileSize } from "@/lib/format/file-size";

type UsageEntry = components["schemas"]["UsageEntry"];
type UsageGroup = components["schemas"]["UsageGroup"];

const FULL_PERCENT = 100;

function percentOf(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.min(FULL_PERCENT, Math.round((value / max) * 100));
}

/** A progress bar with a `current / max` caption, turning red once the cap is hit. */
function UsageBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <Flex align="center" gap={12}>
      <Progress
        percent={percentOf(value, max)}
        showInfo={false}
        status={value >= max ? "exception" : "normal"}
        style={{ flex: 1, margin: 0, minWidth: 120 }}
      />
      <Typography.Text style={{ whiteSpace: "nowrap" }} type="secondary">
        {label}
      </Typography.Text>
    </Flex>
  );
}

export function AccountUsageScreen({ accountId }: { accountId: string }) {
  const { t, i18n } = useLingui();

  const usageQuery = $api.useQuery("get", "/v1/accounts/{account_id}/usage", {
    params: { path: { account_id: accountId } },
  });

  const formatCount = (value: number) =>
    new Intl.NumberFormat(i18n.locale).format(value);

  function columnsFor(group: UsageGroup): ColumnsType<UsageEntry> {
    const hasStorage = group.entries.some(
      (entry) => typeof entry.storageLimit === "number"
    );
    const columns: ColumnsType<UsageEntry> = [
      {
        dataIndex: "key",
        render: (key: string) => {
          const label = USAGE_ENTITY_LABELS[key];
          return <Typography.Text>{label ? t(label) : key}</Typography.Text>;
        },
        title: t`Entité`,
        width: "22%",
      },
      {
        key: "usage",
        render: (_, entry) => (
          <UsageBar
            label={`${formatCount(entry.count)} / ${formatCount(entry.limit)}`}
            max={entry.limit}
            value={entry.count}
          />
        ),
        title: t`Utilisation`,
      },
    ];
    if (hasStorage) {
      columns.push({
        key: "storage",
        render: (_, entry) => {
          if (
            typeof entry.storageLimit !== "number" ||
            typeof entry.totalSize !== "number"
          ) {
            return <Typography.Text type="secondary">{t`—`}</Typography.Text>;
          }
          return (
            <UsageBar
              label={`${formatFileSize(entry.totalSize, i18n.locale)} / ${formatFileSize(entry.storageLimit, i18n.locale)}`}
              max={entry.storageLimit}
              value={entry.totalSize}
            />
          );
        },
        title: t`Stockage`,
      });
    }
    return columns;
  }

  return (
    <Flex gap={24} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Usage`}
      </Typography.Title>

      {usageQuery.isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : null}

      {!usageQuery.isLoading && (usageQuery.isError || !usageQuery.data) ? (
        <Alert
          message={t`Impossible de charger l'utilisation du compte.`}
          showIcon
          type="error"
        />
      ) : null}

      {usageQuery.data?.item.groups.map((group) => {
        const groupLabel = USAGE_GROUP_LABELS[group.key];
        return (
          <Flex gap={8} key={group.key} vertical>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {groupLabel ? t(groupLabel) : group.key}
            </Typography.Title>
            <Table<UsageEntry>
              columns={columnsFor(group)}
              dataSource={group.entries}
              pagination={false}
              rowKey="key"
              size="small"
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
