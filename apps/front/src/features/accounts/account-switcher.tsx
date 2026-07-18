// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

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
import { CreateAccountModal } from "@/features/accounts/create-account-modal";
import { ROLE_LABELS } from "@/features/accounts/labels";
import { SearchModal } from "@/features/accounts/search-modal";
import { useCurrentAccountId } from "@/features/accounts/use-current-account-id";

export function AccountSwitcher({ collapsed }: { collapsed: boolean }) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeId = useCurrentAccountId();

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

  // The `$accountId` layout records the visit — no need to set it here.
  function openAccount(accountId: string) {
    navigate({ to: "/accounts/$accountId", params: { accountId } });
  }

  const items: MenuProps["items"] = [
    ...(accounts.length > 0
      ? accounts.map((account) => ({
          key: account.id,
          label: (
            <Flex align="center" gap={12} style={{ minWidth: 0 }}>
              <AccountAvatar
                name={account.name}
                pictureProfile={account.pictureProfile}
                size={24}
              />
              <Flex style={{ minWidth: 0 }} vertical>
                <Typography.Text ellipsis style={{ lineHeight: 1.3 }}>
                  {account.name}
                </Typography.Text>
                {account.membership ? (
                  <Typography.Text
                    ellipsis
                    style={{ fontSize: 11, lineHeight: 1.3 }}
                    type="secondary"
                  >
                    {t(ROLE_LABELS[account.membership.role])}
                  </Typography.Text>
                ) : null}
              </Flex>
            </Flex>
          ),
          style: { height: "auto", paddingBlock: 6 },
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
      <Flex align="center" gap={10} style={{ minWidth: 0, width: "100%" }}>
        {active ? (
          <AccountAvatar
            name={active.name}
            pictureProfile={active.pictureProfile}
            size={24}
          />
        ) : null}
        <Flex style={{ flex: 1, minWidth: 0, textAlign: "left" }} vertical>
          <Typography.Text ellipsis style={{ lineHeight: 1.3 }}>
            {active?.name ?? t`Sélectionner un compte`}
          </Typography.Text>
          {active?.membership ? (
            <Typography.Text
              ellipsis
              style={{ fontSize: 11, lineHeight: 1.3 }}
              type="secondary"
            >
              {t(ROLE_LABELS[active.membership.role])}
            </Typography.Text>
          ) : null}
        </Flex>
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
            height: collapsed ? 40 : 48,
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
          style={{ alignSelf: "center" }}
          type="text"
        />
      ) : null}

      <CreateAccountModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
      <SearchModal
        accountId={activeId}
        onClose={() => setSearchOpen(false)}
        open={searchOpen}
      />
    </Flex>
  );
}
