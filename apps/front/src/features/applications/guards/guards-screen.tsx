// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { App, Button, Empty, Flex, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import {
  ApplicationStatusTag,
  GuardTypeTag,
} from "@/features/applications/application-tags";
import { GuardFormModal } from "@/features/applications/guards/guard-form-modal";
import { GUARD_FIELD_TYPE_LABELS } from "@/features/applications/labels";
import { RowActions } from "@/features/applications/row-actions";
import { TagsCell } from "@/features/tags/tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";

type Guard = components["schemas"]["ApplicationGuardItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/guards",
];

export function GuardsScreen({
  accountId,
  applicationId,
}: {
  accountId: string;
  applicationId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Guard | undefined>(undefined);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const tagFilters = useTagFilters(accountId, "application_guard");
  const path = { account_id: accountId, application_id: applicationId };

  const guardsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/guards",
    { params: { path, query: tagIds.length ? { tagIds } : {} } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/guards/{guard_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/guards/{guard_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/guards/{guard_id}",
    { meta: { successMessage: t`Guard supprimé` } }
  );

  const guards = guardsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  const onChange: TableProps<Guard>["onChange"] = (_pagination, filters) => {
    setTagIds((filters.tags as string[] | null) ?? []);
  };

  async function changeStatus(guard: Guard, status: Guard["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { ...path, guard_id: guard.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(guard: Guard, type: Guard["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { ...path, guard_id: guard.id } },
      body: { type },
    });
    invalidate();
  }

  function confirmDelete(guard: Guard) {
    modal.confirm({
      title: t`Supprimer ${guard.title} ?`,
      content: t`Les routes protégées par ce guard ne le référenceront plus.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, guard_id: guard.id } },
        });
        invalidate();
      },
    });
  }

  const columns: TableProps<Guard>["columns"] = [
    {
      title: t`Titre`,
      dataIndex: "title",
      width: COL.title,
      ellipsis: true,
      render: (title: string) => (
        <Typography.Text strong>{title}</Typography.Text>
      ),
    },
    {
      title: t`Type`,
      dataIndex: "type",
      width: COL.type,
      render: (type: Guard["type"], guard) => (
        <GuardTypeTag
          loading={typeMutation.isPending}
          onChange={(next) => changeType(guard, next)}
          type={type}
        />
      ),
    },
    {
      title: t`Emplacement`,
      dataIndex: "fieldType",
      width: COL.text,
      ellipsis: true,
      render: (fieldType: Guard["fieldType"]) =>
        t(GUARD_FIELD_TYPE_LABELS[fieldType]),
    },
    {
      title: t`Clé`,
      dataIndex: "fieldKey",
      width: COL.text,
      render: (fieldKey: string) => <Tag>{fieldKey}</Tag>,
    },
    {
      title: t`Format`,
      dataIndex: "fieldFormat",
      width: COL.text,
      ellipsis: true,
      render: (fieldFormat: string | null) => fieldFormat ?? "—",
    },
    {
      title: t`Statut`,
      dataIndex: "status",
      width: COL.status,
      render: (status: Guard["status"], guard) => (
        <ApplicationStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(guard, next)}
          status={status}
        />
      ),
    },
    {
      title: t`Tags`,
      key: "tags",
      dataIndex: "tags",
      width: COL.tags,
      filters: tagFilters,
      filteredValue: tagIds.length ? tagIds : null,
      render: (tags: Guard["tags"]) => <TagsCell tags={tags} />,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: 2 }),
      render: (_, guard) => (
        <RowActions
          onDelete={() => confirmDelete(guard)}
          onEdit={() => {
            setEditing(guard);
            setFormOpen(true);
          }}
        />
      ),
    },
  ];

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Guards`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          type="primary"
        >
          {t`Créer un guard`}
        </Button>
      </Flex>

      {guards.length === 0 && !guardsQuery.isLoading && !tagIds.length ? (
        <Empty description={t`Aucun guard`} />
      ) : (
        <Table<Guard>
          columns={columns}
          dataSource={guards}
          loading={guardsQuery.isLoading}
          onChange={onChange}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          scroll={scrollX(columns)}
          size="small"
        />
      )}

      <GuardFormModal
        accountId={accountId}
        applicationId={applicationId}
        guard={editing}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />
    </Flex>
  );
}
