import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { AccountAvatar } from "@/features/accounts/account-avatar";
import { AccountRoleTag } from "@/features/accounts/account-role-tag";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";
import { CreateAccountModal } from "@/features/accounts/create-account-modal";
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS } from "@/features/accounts/labels";
import { AccountStatusTag } from "@/features/accounts/status-tags";

type Account = components["schemas"]["AccountItem"];
type Status = components["schemas"]["AccountStatus"];
type Role = components["schemas"]["AccountUserRole"];
type SortField = components["schemas"]["AccountSortField"];
type SortOrder = components["schemas"]["SortOrder"];

// antd column keys -> backend sort fields.
const SORT_FIELD: Record<string, SortField> = {
  name: "name",
  createdDate: "created_date",
  status: "status",
  role: "role",
};

export function AccountsList() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);
  const [createOpen, setCreateOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("created_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const accountsQuery = $api.useQuery("get", "/v1/accounts", {
    params: {
      query: {
        page,
        limit,
        sortBy,
        sortOrder,
        ...(statuses.length ? { status: statuses } : {}),
        ...(roles.length ? { role: roles } : {}),
      },
    },
  });

  const accounts = accountsQuery.data?.items ?? [];
  const total = accountsQuery.data?.count ?? 0;
  const hasFilters = statuses.length > 0 || roles.length > 0;

  function openAccount(accountId: string) {
    setActiveId(accountId);
    navigate({ to: "/accounts/$accountId", params: { accountId } });
  }

  const antdOrder = (field: SortField): "ascend" | "descend" | null => {
    if (sortBy !== field) {
      return null;
    }
    return sortOrder === "asc" ? "ascend" : "descend";
  };

  const onChange: TableProps<Account>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    setPage(pagination.current ?? 1);
    setLimit((pagination.pageSize as 10 | 25 | 50 | 100) ?? 25);
    setStatuses((filters.status as Status[] | null) ?? []);
    setRoles((filters.role as Role[] | null) ?? []);
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.order && single.columnKey) {
      setSortBy(SORT_FIELD[String(single.columnKey)] ?? "created_date");
      setSortOrder(single.order === "ascend" ? "asc" : "desc");
    }
  };

  if (total === 0 && !hasFilters && !accountsQuery.isLoading) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Comptes`}
        </Typography.Title>
        <Empty description={t`Vous n'appartenez à aucun compte`}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
            type="primary"
          >
            {t`Créer un compte`}
          </Button>
        </Empty>
        <CreateAccountModal
          onClose={() => setCreateOpen(false)}
          open={createOpen}
        />
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Comptes`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
          type="primary"
        >
          {t`Créer un compte`}
        </Button>
      </Flex>

      <Table<Account>
        columns={[
          {
            title: t`Nom`,
            key: "name",
            dataIndex: "name",
            sorter: true,
            sortOrder: antdOrder("name"),
            render: (name: string, account) => (
              <Flex align="center" gap={8}>
                <AccountAvatar
                  name={name}
                  pictureProfile={account.pictureProfile}
                />
                <Link
                  params={{ accountId: account.id }}
                  to="/accounts/$accountId"
                >
                  <Typography.Text strong>{name}</Typography.Text>
                </Link>
              </Flex>
            ),
          },
          {
            title: t`Mon rôle`,
            key: "role",
            dataIndex: ["membership", "role"],
            sorter: true,
            sortOrder: antdOrder("role"),
            filters: dtoEnums.AccountUserRole.map((value) => ({
              text: t(ROLE_LABELS[value]),
              value,
            })),
            filteredValue: roles.length ? roles : null,
            render: (_, account) =>
              account.membership ? (
                <AccountRoleTag role={account.membership.role} />
              ) : (
                "—"
              ),
          },
          {
            title: t`Statut`,
            key: "status",
            dataIndex: "status",
            sorter: true,
            sortOrder: antdOrder("status"),
            filters: dtoEnums.AccountStatus.map((value) => ({
              text: t(ACCOUNT_STATUS_LABELS[value]),
              value,
            })),
            filteredValue: statuses.length ? statuses : null,
            render: (status: Status) => <AccountStatusTag status={status} />,
          },
          {
            title: t`Créé le`,
            key: "createdDate",
            dataIndex: "createdDate",
            sorter: true,
            sortOrder: antdOrder("created_date"),
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "—",
          },
          {
            title: "",
            key: "actions",
            align: "right",
            render: (_, account) => (
              <Button
                icon={<ArrowRightOutlined />}
                iconPosition="end"
                onClick={() => openAccount(account.id)}
                size="small"
                type="primary"
              >
                {t`Accéder`}
              </Button>
            ),
          },
        ]}
        dataSource={accounts}
        loading={accountsQuery.isLoading}
        onChange={onChange}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
        }}
        rowKey="id"
        size="small"
      />

      <CreateAccountModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </Flex>
  );
}
