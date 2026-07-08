import {
  CaretDownOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { Button, Dropdown, Flex, Typography } from "antd";
import { type ReactNode, useEffect, useState } from "react";
import { $api } from "@/api/$api";
import { AccountAvatar } from "@/features/accounts/account-avatar";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";
import { CreateAccountModal } from "@/features/accounts/create-account-modal";
import { SearchModal } from "@/features/accounts/search-modal";

export function AccountSwitcher({ collapsed }: { collapsed: boolean }) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeId = useActiveAccountStore((state) => state.accountId);
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);

  const accountsQuery = $api.useQuery("get", "/v1/accounts", {
    params: { query: { limit: 100 } },
  });
  const accounts = accountsQuery.data?.items ?? [];
  const active = accounts.find((account) => account.id === activeId);

  // ⌘K / Ctrl+K opens the search modal (only when an account is active).
  useEffect(() => {
    if (!active) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  function openAccount(accountId: string) {
    setActiveId(accountId);
    navigate({ to: "/accounts/$accountId", params: { accountId } });
  }

  const items: MenuProps["items"] = [
    ...(accounts.length > 0
      ? accounts.map((account) => ({
          key: account.id,
          icon: (
            <AccountAvatar
              name={account.name}
              pictureProfile={account.pictureProfile}
              size={20}
            />
          ),
          label: account.name,
          onClick: () => openAccount(account.id),
        }))
      : [{ key: "empty", disabled: true, label: t`Aucun compte` }]),
    { type: "divider" as const },
    {
      key: "create",
      icon: <PlusOutlined />,
      label: t`Créer un compte`,
      onClick: () => setCreateOpen(true),
    },
  ];

  let trigger: ReactNode;
  if (collapsed) {
    trigger = active ? (
      <AccountAvatar
        name={active.name}
        pictureProfile={active.pictureProfile}
        size={22}
      />
    ) : (
      <PlusOutlined />
    );
  } else {
    trigger = (
      <Flex align="center" gap={8} style={{ minWidth: 0, width: "100%" }}>
        {active ? (
          <AccountAvatar
            name={active.name}
            pictureProfile={active.pictureProfile}
            size={22}
          />
        ) : null}
        <Typography.Text ellipsis style={{ flex: 1, textAlign: "left" }}>
          {active?.name ?? t`Sélectionner un compte`}
        </Typography.Text>
        <CaretDownOutlined style={{ fontSize: 10 }} />
      </Flex>
    );
  }

  return (
    <Flex gap={8} style={{ padding: 8 }} vertical>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Button
          block
          style={{
            height: 40,
            justifyContent: collapsed ? "center" : "space-between",
            paddingInline: collapsed ? 0 : 8,
          }}
        >
          {trigger}
        </Button>
      </Dropdown>

      {active && !collapsed ? (
        <Button
          onClick={() => setSearchOpen(true)}
          style={{ justifyContent: "space-between", paddingInline: 8 }}
          type="text"
        >
          <Flex
            align="center"
            gap={8}
            style={{ color: "var(--ant-color-text-secondary)" }}
          >
            <SearchOutlined />
            <span>{t`Rechercher`}</span>
          </Flex>
          <Typography.Text keyboard style={{ fontSize: 11 }}>
            ⌘K
          </Typography.Text>
        </Button>
      ) : null}

      {active && collapsed ? (
        <Button
          icon={<SearchOutlined />}
          onClick={() => setSearchOpen(true)}
          type="text"
        />
      ) : null}

      <CreateAccountModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
      <SearchModal onClose={() => setSearchOpen(false)} open={searchOpen} />
    </Flex>
  );
}
