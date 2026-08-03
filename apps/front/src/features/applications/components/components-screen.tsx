// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import {
  App,
  Button,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { ComponentActivityDrawer } from "@/features/applications/components/component-activity-drawer";
import { ComponentFormModal } from "@/features/applications/components/component-form-modal";
import {
  ComponentStatusTag,
  ComponentTypeTag,
} from "@/features/applications/components/component-tags";
import { CommentCountButton } from "@/features/comments/comment-count-button";
import { complexityColumn } from "@/features/complexity/complexity-column";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { votesColumn } from "@/features/votes/votes-column";

type Component = components["schemas"]["ApplicationComponentItem"];

const LIST_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components";
const ITEM_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}";

export function ComponentsScreen({
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
  const [editing, setEditing] = useState<Component | undefined>(undefined);
  const [opened, setOpened] = useState<Component | undefined>(undefined);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [myComplexity, setMyComplexity] = useState<string | null>(null);

  const tagFilters = useTagFilters(accountId, "application_component");
  const path = { account_id: accountId, application_id: applicationId };

  const componentsQuery = $api.useQuery("get", LIST_PATH, {
    params: {
      path,
      query: {
        ...(tagIds.length ? { tagIds } : {}),
        ...(myComplexity ? { myComplexity } : {}),
      },
    },
  });
  const statusMutation = $api.useMutation("patch", ITEM_PATH, {
    meta: { successMessage: t`Statut mis à jour` },
  });
  const typeMutation = $api.useMutation("patch", ITEM_PATH, {
    meta: { successMessage: t`Type mis à jour` },
  });
  const tagsMutation = $api.useMutation("patch", ITEM_PATH, {
    meta: { successMessage: t`Tags mis à jour` },
  });
  const deleteMutation = $api.useMutation("delete", ITEM_PATH, {
    meta: { successMessage: t`Composant supprimé` },
  });
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/lock",
    { meta: { successMessage: t`Composant verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/unlock",
    { meta: { successMessage: t`Composant déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;
  const components = componentsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["get", LIST_PATH] });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/components"],
    });
  }

  const onChange: TableProps<Component>["onChange"] = (
    _pagination,
    filters
  ) => {
    setTagIds((filters.tags as string[] | null) ?? []);
    setMyComplexity((filters.complexity as string[] | null)?.[0] ?? null);
  };

  async function changeStatus(
    component: Component,
    status: Component["status"]
  ) {
    await statusMutation.mutateAsync({
      params: { path: { ...path, component_id: component.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(component: Component, type: Component["type"]) {
    await typeMutation.mutateAsync({
      params: { path: { ...path, component_id: component.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeTags(component: Component, next: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { ...path, component_id: component.id } },
      body: { tagIds: next },
    });
    invalidate();
  }

  async function toggleLock(component: Component) {
    const mutation = component.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { ...path, component_id: component.id } },
    });
    invalidate();
  }

  function confirmDelete(component: Component) {
    modal.confirm({
      title: t`Supprimer ${component.title} ?`,
      content: t`Le composant est retiré de l'application. Ses commentaires, votes et estimations ne seront plus accessibles.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, component_id: component.id } },
        });
        invalidate();
      },
    });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  const columns: TableProps<Component>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      width: COL.title,
      ellipsis: true,
      render: (title: string, component) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={component.locked}
            lockedBy={component.lockedBy}
            lockedDate={component.lockedDate}
          />
          <Typography.Text ellipsis strong>
            {title}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      width: COL.type,
      render: (type: Component["type"], component) => (
        <ComponentTypeTag
          loading={typeMutation.isPending}
          onChange={
            component.locked ? undefined : (next) => changeType(component, next)
          }
          type={type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      width: COL.status,
      render: (status: Component["status"], component) => (
        <ComponentStatusTag
          loading={statusMutation.isPending}
          onChange={
            component.locked
              ? undefined
              : (next) => changeStatus(component, next)
          }
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
      render: (tags: Component["tags"], component) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="application_component"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(component, next)}
          readOnly={component.locked}
          tags={tags}
          value={component.tagIds}
        />
      ),
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote: null }),
    complexityColumn({ t, myComplexity }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: canManageLock ? 4 : 3 }),
      render: (_, component) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={component.locked}
              onToggle={() => toggleLock(component)}
              pending={lockPending}
            />
          ) : null}
          <CommentCountButton
            count={component.commentCount}
            onClick={() => setOpened(component)}
          />
          <Tooltip
            title={component.locked ? t`Composant verrouillé` : t`Modifier`}
          >
            <Button
              disabled={component.locked}
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(component);
                setFormOpen(true);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={component.locked ? t`Composant verrouillé` : t`Supprimer`}
          >
            <Button
              danger
              disabled={component.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(component)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Composants`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer un composant`}
        </Button>
      </Flex>

      {components.length === 0 &&
      !(componentsQuery.isLoading || tagIds.length || myComplexity) ? (
        <Empty
          description={t`Aucun composant. Décrivez les briques dont cette application est faite.`}
        >
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer un composant`}
          </Button>
        </Empty>
      ) : (
        <Table<Component>
          columns={columns}
          dataSource={components}
          loading={componentsQuery.isLoading}
          onChange={onChange}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          scroll={scrollX(columns)}
          size="small"
        />
      )}

      <ComponentFormModal
        accountId={accountId}
        applicationId={applicationId}
        component={editing}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />
      <ComponentActivityDrawer
        accountId={accountId}
        applicationId={applicationId}
        component={opened}
        onClose={() => setOpened(undefined)}
      />
    </Flex>
  );
}
