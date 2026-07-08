import {
  CaretDownOutlined,
  CheckOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { Button, Dropdown, Flex, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";
import { CreateAccountModal } from "@/features/accounts/create-account-modal";

export function AccountSwitcher({ collapsed }: { collapsed: boolean }) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const activeId = useActiveAccountStore((state) => state.accountId);
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);

  const accountsQuery = $api.useQuery("get", "/v1/accounts");
  const accounts = accountsQuery.data?.items ?? [];
  const active = accounts.find((account) => account.id === activeId);

  function open(accountId: string) {
    setActiveId(accountId);
    navigate({ to: "/accounts/$accountId", params: { accountId } });
  }

  const items: MenuProps["items"] = [
    ...(accounts.length > 0
      ? accounts.map((account) => ({
          key: account.id,
          icon: account.id === activeId ? <CheckOutlined /> : <TeamOutlined />,
          label: account.name,
          onClick: () => open(account.id),
        }))
      : [{ key: "empty", disabled: true, label: t`Aucun compte` }]),
    { type: "divider" as const },
    {
      key: "all",
      label: t`Tous les comptes`,
      onClick: () => navigate({ to: "/me/accounts" }),
    },
    {
      key: "create",
      icon: <PlusOutlined />,
      label: t`Créer un compte`,
      onClick: () => setCreateOpen(true),
    },
  ];

  return (
    <div style={{ padding: 8 }}>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Button
          block
          style={{
            height: 40,
            justifyContent: collapsed ? "center" : "space-between",
            paddingInline: collapsed ? 0 : 10,
          }}
          type="default"
        >
          {collapsed ? (
            <TeamOutlined />
          ) : (
            <Flex align="center" gap={8} style={{ minWidth: 0 }}>
              <TeamOutlined />
              <Typography.Text ellipsis style={{ maxWidth: 150 }}>
                {active?.name ?? t`Sélectionner un compte`}
              </Typography.Text>
              <CaretDownOutlined
                style={{ fontSize: 10, marginInlineStart: "auto" }}
              />
            </Flex>
          )}
        </Button>
      </Dropdown>
      <CreateAccountModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </div>
  );
}
