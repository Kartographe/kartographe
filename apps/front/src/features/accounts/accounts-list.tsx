import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { AccountRoleTag } from "@/features/accounts/account-role-tag";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";
import { CreateAccountModal } from "@/features/accounts/create-account-modal";
import { AccountStatusTag } from "@/features/accounts/status-tags";

type Account = components["schemas"]["AccountItem"];

export function AccountsList() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);
  const [createOpen, setCreateOpen] = useState(false);

  const accountsQuery = $api.useQuery("get", "/v1/accounts");
  const accounts = accountsQuery.data?.items ?? [];

  function openAccount(accountId: string) {
    setActiveId(accountId);
    navigate({ to: "/accounts/$accountId", params: { accountId } });
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

      {accounts.length === 0 && !accountsQuery.isLoading ? (
        <Empty description={t`Vous n'appartenez à aucun compte`}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
            type="primary"
          >
            {t`Créer un compte`}
          </Button>
        </Empty>
      ) : (
        <Table<Account>
          columns={[
            {
              title: t`Nom`,
              dataIndex: "name",
              render: (name: string, account) => (
                <Link
                  params={{ accountId: account.id }}
                  to="/accounts/$accountId"
                >
                  <Typography.Text strong>{name}</Typography.Text>
                </Link>
              ),
            },
            {
              title: t`Mon rôle`,
              dataIndex: ["membership", "role"],
              render: (_, account) =>
                account.membership ? (
                  <AccountRoleTag role={account.membership.role} />
                ) : (
                  "—"
                ),
            },
            {
              title: t`Statut`,
              dataIndex: "status",
              render: (status: Account["status"]) => (
                <AccountStatusTag status={status} />
              ),
            },
            {
              title: t`Créé le`,
              dataIndex: "createdDate",
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
          pagination={false}
          rowKey="id"
          size="small"
        />
      )}

      <CreateAccountModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </Flex>
  );
}
