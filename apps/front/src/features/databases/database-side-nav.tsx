// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  BranchesOutlined,
  CommentOutlined,
  InfoCircleOutlined,
  LikeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import { Flex, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  compareVersionsDesc,
  formatVersion,
  MIGRATION_STATUS_COLORS,
  MIGRATION_STATUS_LABELS,
  VERSION_STATUS_COLORS,
  VERSION_STATUS_LABELS,
} from "@/features/databases/labels";
import { useVersionLookup } from "@/features/databases/migrations/use-version-lookup";

type DatabaseVersion = components["schemas"]["DatabaseVersionItem"];
type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

function linkStyle(active: boolean) {
  return {
    alignItems: "center",
    background: active ? "var(--ant-color-primary-bg)" : "transparent",
    borderRadius: 8,
    color: active ? "var(--ant-color-primary)" : "var(--ant-color-text)",
    display: "flex",
    fontWeight: active ? 600 : 400,
    gap: 10,
    padding: "8px 12px",
  } as const;
}

function NavLink({
  item,
  accountId,
  databaseId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  databaseId: string;
  pathname: string;
}) {
  const resolved = item.to
    .replace("$accountId", accountId)
    .replace("$databaseId", databaseId);
  const active = item.exact
    ? pathname === resolved
    : pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId, databaseId }}
      style={linkStyle(active)}
      to={item.to}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

/**
 * A version, reachable in one click from the nav. The status is a plain `Tag`
 * rather than the usual `EnumTag`: its description popover is a button, and a
 * button nested inside a link is not something to hand a keyboard user.
 */
function VersionLink({
  version,
  accountId,
  databaseId,
  pathname,
}: {
  version: DatabaseVersion;
  accountId: string;
  databaseId: string;
  pathname: string;
}) {
  const { t } = useLingui();
  const resolved = `/accounts/${accountId}/databases/${databaseId}/versions/${version.id}`;
  const active = pathname === resolved || pathname.startsWith(`${resolved}/`);

  return (
    <Link
      params={{ accountId, databaseId, versionId: version.id }}
      style={{
        ...linkStyle(active),
        fontSize: 12,
        justifyContent: "space-between",
        paddingBlock: 6,
        paddingInlineStart: 32,
      }}
      to="/accounts/$accountId/databases/$databaseId/versions/$versionId"
    >
      <Typography.Text
        ellipsis
        style={{ color: "inherit", fontSize: 12, fontWeight: "inherit" }}
      >
        {formatVersion(version.version)}
      </Typography.Text>
      <Tag
        color={VERSION_STATUS_COLORS[version.status]}
        style={{ fontSize: 10, lineHeight: "16px", marginInlineEnd: 0 }}
      >
        {t(VERSION_STATUS_LABELS[version.status])}
      </Tag>
    </Link>
  );
}

/**
 * A migration, read as the `v1.0.0 → v2.0.0` it plans. Same reason as
 * `VersionLink` for the plain `Tag`: no button inside a link.
 */
function MigrationLink({
  migration,
  accountId,
  databaseId,
  pathname,
  versions,
}: {
  migration: DatabaseMigration;
  accountId: string;
  databaseId: string;
  pathname: string;
  versions: ReturnType<typeof useVersionLookup>;
}) {
  const { t } = useLingui();
  const resolved = `/accounts/${accountId}/databases/${databaseId}/migrations/${migration.id}`;
  const active = pathname === resolved || pathname.startsWith(`${resolved}/`);

  const from =
    versions.format(
      migration.sourceDatabaseId,
      migration.sourceDatabaseVersionId
    ) ?? "…";
  const to =
    versions.format(
      migration.destinationDatabaseId,
      migration.destinationDatabaseVersionId
    ) ?? "…";

  return (
    <Link
      params={{ accountId, databaseId, migrationId: migration.id }}
      style={{
        ...linkStyle(active),
        fontSize: 12,
        justifyContent: "space-between",
        paddingBlock: 6,
        paddingInlineStart: 32,
      }}
      title={migration.title}
      to="/accounts/$accountId/databases/$databaseId/migrations/$migrationId"
    >
      <Typography.Text
        ellipsis
        style={{ color: "inherit", fontSize: 12, fontWeight: "inherit" }}
      >
        {`${from} → ${to}`}
      </Typography.Text>
      <Tag
        color={MIGRATION_STATUS_COLORS[migration.status]}
        style={{ fontSize: 10, lineHeight: "16px", marginInlineEnd: 0 }}
      >
        {t(MIGRATION_STATUS_LABELS[migration.status])}
      </Tag>
    </Link>
  );
}

const BASE = "/accounts/$accountId/databases/$databaseId";

export function DatabaseSideNav({
  accountId,
  databaseId,
}: {
  accountId: string;
  databaseId: string;
}) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const versionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions",
    { params: { path: { account_id: accountId, database_id: databaseId } } }
  );
  const versions = [...(versionsQuery.data?.items ?? [])].sort((a, b) =>
    compareVersionsDesc(a.version, b.version)
  );

  const migrationsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations",
    { params: { path: { account_id: accountId, database_id: databaseId } } }
  );
  // Already most recent first, straight from the API.
  const migrations = migrationsQuery.data?.items ?? [];
  const migrationVersions = useVersionLookup(accountId, [
    databaseId,
    ...migrations.flatMap((migration) => [
      migration.sourceDatabaseId,
      migration.destinationDatabaseId,
    ]),
  ]);

  const overview: NavItem = {
    to: BASE,
    label: t`Informations`,
    icon: <InfoCircleOutlined />,
    exact: true,
  };
  // `exact`: the section itself, not the versions listed under it — each of
  // those lights up on its own.
  const versionsItem: NavItem = {
    to: `${BASE}/versions`,
    label: t`Versions`,
    icon: <BranchesOutlined />,
    exact: true,
  };
  // `exact`: same as the versions section — each migration lights up on its own.
  const migrationsItem: NavItem = {
    to: `${BASE}/migrations`,
    label: t`Migrations`,
    icon: <SwapOutlined />,
    exact: true,
  };
  const comments: NavItem = {
    to: `${BASE}/comments`,
    label: t`Commentaires`,
    icon: <CommentOutlined />,
  };
  const votes: NavItem = {
    to: `${BASE}/votes`,
    label: t`Votes`,
    icon: <LikeOutlined />,
  };

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        height: "100%",
        padding: 8,
      }}
    >
      {[overview, versionsItem].map((item) => (
        <NavLink
          accountId={accountId}
          databaseId={databaseId}
          item={item}
          key={item.to}
          pathname={pathname}
        />
      ))}

      {versions.length > 0 ? (
        <Flex gap={2} vertical>
          {versions.map((version) => (
            <VersionLink
              accountId={accountId}
              databaseId={databaseId}
              key={version.id}
              pathname={pathname}
              version={version}
            />
          ))}
        </Flex>
      ) : null}

      <NavLink
        accountId={accountId}
        databaseId={databaseId}
        item={migrationsItem}
        pathname={pathname}
      />

      {migrations.length > 0 ? (
        <Flex gap={2} vertical>
          {migrations.map((migration) => (
            <MigrationLink
              accountId={accountId}
              databaseId={databaseId}
              key={migration.id}
              migration={migration}
              pathname={pathname}
              versions={migrationVersions}
            />
          ))}
        </Flex>
      ) : null}

      <NavLink
        accountId={accountId}
        databaseId={databaseId}
        item={comments}
        pathname={pathname}
      />
      <NavLink
        accountId={accountId}
        databaseId={databaseId}
        item={votes}
        pathname={pathname}
      />
    </nav>
  );
}
