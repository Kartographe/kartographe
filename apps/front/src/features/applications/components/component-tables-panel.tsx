// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Badge,
  Button,
  Empty,
  Flex,
  List,
  Skeleton,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { ComponentTableFormModal } from "@/features/applications/components/component-table-form-modal";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type ComponentTable =
  components["schemas"]["ApplicationComponentDatabaseTableItem"];

const LIST_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/tables";
const ITEM_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/tables/{component_table_id}";

interface ComponentTablesPanelProps {
  accountId: string;
  applicationId: string;
  componentId: string;
  /** A locked component still shows its links, but stops offering to edit them. */
  readOnly?: boolean;
}

/**
 * The database tables a component works with. The API resolves each link's
 * table name, so this reads one endpoint — no walk through databases and
 * versions to name what is already linked.
 */
export function ComponentTablesPanel({
  accountId,
  applicationId,
  componentId,
  readOnly = false,
}: ComponentTablesPanelProps) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<ComponentTable | undefined | null>(null);

  const path = {
    account_id: accountId,
    application_id: applicationId,
    component_id: componentId,
  };

  const linksQuery = $api.useQuery("get", LIST_PATH, { params: { path } });
  const deleteMutation = $api.useMutation("delete", ITEM_PATH, {
    meta: { successMessage: t`Table détachée` },
  });

  const links = linksQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["get", LIST_PATH] });
  }

  function confirmDelete(link: ComponentTable) {
    modal.confirm({
      title: link.databaseTableName
        ? t`Détacher ${link.databaseTableName} ?`
        : t`Détacher cette table ?`,
      content: t`La table elle-même n'est pas supprimée, seul le lien avec ce composant disparaît.`,
      okText: t`Détacher`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, component_table_id: link.id } },
        });
        invalidate();
      },
    });
  }

  function renderLinks() {
    if (linksQuery.isLoading) {
      return <Skeleton active paragraph={{ rows: 2 }} title={false} />;
    }
    if (links.length === 0) {
      return (
        <Empty
          description={t`Aucune table liée.`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }
    return (
      <List
        dataSource={links}
        renderItem={(link: ComponentTable) => (
          <List.Item
            extra={
              readOnly ? null : (
                <Space>
                  <Tooltip title={t`Modifier`}>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => setForm(link)}
                      size="small"
                    />
                  </Tooltip>
                  <Tooltip title={t`Détacher`}>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => confirmDelete(link)}
                      size="small"
                    />
                  </Tooltip>
                </Space>
              )
            }
            key={link.id}
          >
            <List.Item.Meta
              description={
                link.description ? (
                  <RichTextView value={link.description} />
                ) : null
              }
              title={
                link.databaseTableName ?? (
                  // The link outlived its table (deleted since).
                  <Typography.Text type="secondary">{t`Table supprimée`}</Typography.Text>
                )
              }
            />
          </List.Item>
        )}
      />
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t`Tables`}
          </Typography.Title>
          {links.length > 0 ? (
            <Badge
              color="var(--ant-color-fill-secondary)"
              count={links.length}
              style={{ color: "var(--ant-color-text)" }}
            />
          ) : null}
        </Flex>
        {readOnly ? null : (
          <Button
            icon={<PlusOutlined />}
            onClick={() => setForm(undefined)}
            size="small"
          >
            {t`Lier une table`}
          </Button>
        )}
      </Flex>

      {renderLinks()}

      {form === null ? null : (
        <ComponentTableFormModal
          accountId={accountId}
          applicationId={applicationId}
          componentId={componentId}
          key={form?.id ?? "create"}
          link={form}
          onClose={() => setForm(null)}
          open
        />
      )}
    </Flex>
  );
}
