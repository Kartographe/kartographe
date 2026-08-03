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
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { BoundedContextActivityDrawer } from "@/features/applications/bounded-contexts/bounded-context-activity-drawer";
import { BoundedContextFormModal } from "@/features/applications/bounded-contexts/bounded-context-form-modal";
import { CommentCountButton } from "@/features/comments/comment-count-button";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { votesColumn } from "@/features/votes/votes-column";

type BoundedContext = components["schemas"]["ApplicationBoundedContextItem"];

const LIST_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts";
const ITEM_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}";
const COMPONENTS_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components";

export function BoundedContextsScreen({
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
  const [editing, setEditing] = useState<BoundedContext | undefined>(undefined);
  const [opened, setOpened] = useState<BoundedContext | undefined>(undefined);

  const path = { account_id: accountId, application_id: applicationId };

  const contextsQuery = $api.useQuery("get", LIST_PATH, { params: { path } });
  // The context stores component ids; their titles come from the application's
  // own component listing.
  const componentsQuery = $api.useQuery("get", COMPONENTS_PATH, {
    params: { path },
  });
  const deleteMutation = $api.useMutation("delete", ITEM_PATH, {
    meta: { successMessage: t`Contexte borné supprimé` },
  });
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}/lock",
    { meta: { successMessage: t`Contexte borné verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}/unlock",
    { meta: { successMessage: t`Contexte borné déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;
  const contexts = contextsQuery.data?.items ?? [];
  const componentTitles = new Map(
    (componentsQuery.data?.items ?? []).map((component) => [
      component.id,
      component.title,
    ])
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["get", LIST_PATH] });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/bounded-contexts"],
    });
  }

  async function toggleLock(context: BoundedContext) {
    const mutation = context.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { ...path, bounded_context_id: context.id } },
    });
    invalidate();
  }

  function confirmDelete(context: BoundedContext) {
    modal.confirm({
      title: t`Supprimer ${context.title} ?`,
      content: t`Les composants qu'il regroupe ne sont pas supprimés, seule la frontière disparaît.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, bounded_context_id: context.id } },
        });
        invalidate();
      },
    });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  const columns: TableProps<BoundedContext>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      width: COL.title,
      ellipsis: true,
      render: (title: string, context) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={context.locked}
            lockedBy={context.lockedBy}
            lockedDate={context.lockedDate}
          />
          <Typography.Text ellipsis strong>
            {title}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t`Composants`,
      key: "applicationComponentIds",
      dataIndex: "applicationComponentIds",
      width: COL.description,
      render: (ids: string[]) =>
        ids.length ? (
          <Flex gap={4} wrap>
            {ids.map((id) => (
              <Tag key={id} style={{ marginInlineEnd: 0 }}>
                {componentTitles.get(id) ?? t`Composant supprimé`}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">{t`Aucun`}</Typography.Text>
        ),
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote: null }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: canManageLock ? 4 : 3 }),
      render: (_, context) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={context.locked}
              onToggle={() => toggleLock(context)}
              pending={lockPending}
            />
          ) : null}
          <CommentCountButton
            count={context.commentCount}
            onClick={() => setOpened(context)}
          />
          <Tooltip
            title={context.locked ? t`Contexte verrouillé` : t`Modifier`}
          >
            <Button
              disabled={context.locked}
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(context);
                setFormOpen(true);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={context.locked ? t`Contexte verrouillé` : t`Supprimer`}
          >
            <Button
              danger
              disabled={context.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(context)}
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
          {t`Contextes bornés`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer un contexte`}
        </Button>
      </Flex>

      {contexts.length === 0 && !contextsQuery.isLoading ? (
        <Empty
          description={t`Aucun contexte borné. Délimitez les zones du domaine de cette application.`}
        >
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer un contexte`}
          </Button>
        </Empty>
      ) : (
        <Table<BoundedContext>
          columns={columns}
          dataSource={contexts}
          loading={contextsQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          scroll={scrollX(columns)}
          size="small"
        />
      )}

      <BoundedContextFormModal
        accountId={accountId}
        applicationId={applicationId}
        boundedContext={editing}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />
      <BoundedContextActivityDrawer
        accountId={accountId}
        applicationId={applicationId}
        boundedContext={opened}
        onClose={() => setOpened(undefined)}
      />
    </Flex>
  );
}
