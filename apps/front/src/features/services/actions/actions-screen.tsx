// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Collapse,
  Descriptions,
  Empty,
  Flex,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  HTTP_METHOD_COLORS,
  MethodTag,
  tintMethod,
} from "@/components/method-tag";
import { RoutePath } from "@/components/route-path";
import { ActionCommentsDrawer } from "@/features/services/actions/action-comments-drawer";
import { ActionFormModal } from "@/features/services/actions/action-form-modal";
import {
  ActionStatusTag,
  ActionTypeTag,
} from "@/features/services/service-tags";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type ServiceAction = components["schemas"]["ServiceActionItem"];
type Status = components["schemas"]["ServiceActionStatus"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/services/{service_id}/actions",
];

/**
 * Only HTTP-shaped actions get the Swagger opblock treatment; an event or a job
 * has no method to colour by, so it falls back to a neutral card.
 */
function panelStyle(action: ServiceAction) {
  const color = action.method ? HTTP_METHOD_COLORS[action.method] : null;
  return {
    background: color ? tintMethod(color) : "var(--ant-color-fill-quaternary)",
    border: `1px solid ${color ?? "var(--ant-color-border-secondary)"}`,
    borderRadius: 4,
    marginBottom: 8,
    opacity: action.status === "archived" ? 0.6 : 1,
  };
}

export function ActionsScreen({
  accountId,
  serviceId,
}: {
  accountId: string;
  serviceId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceAction | undefined>(undefined);
  const [commented, setCommented] = useState<ServiceAction | undefined>(
    undefined
  );

  const path = { account_id: accountId, service_id: serviceId };

  const actionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services/{service_id}/actions",
    { params: { path } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}",
    { meta: { successMessage: t`Action supprimée` } }
  );

  const actions = actionsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function changeStatus(action: ServiceAction, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { ...path, action_id: action.id } },
      body: { status },
    });
    invalidate();
  }

  function confirmDelete(action: ServiceAction) {
    modal.confirm({
      title: t`Supprimer ${action.title} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, action_id: action.id } },
        });
        invalidate();
      },
    });
  }

  const items = actions.map((action) => {
    return {
      key: action.id,
      style: panelStyle(action),
      label: (
        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
          {action.method ? <MethodTag method={action.method} /> : null}
          {action.path ? <RoutePath path={action.path} /> : null}
          <Typography.Text ellipsis style={{ flex: 1 }} type="secondary">
            {action.title}
          </Typography.Text>
          <ActionTypeTag type={action.type} />
          <ActionStatusTag
            loading={statusMutation.isPending}
            onChange={(next) => changeStatus(action, next)}
            status={action.status}
          />
        </Flex>
      ),
      extra: (
        <Flex gap={4} onClick={(event) => event.stopPropagation()}>
          <Tooltip title={t`Commentaires`}>
            <Button
              icon={<CommentOutlined />}
              onClick={() => setCommented(action)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Modifier`}>
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(action);
                setFormOpen(true);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(action)}
              size="small"
            />
          </Tooltip>
        </Flex>
      ),
      children: (
        <Flex
          style={{
            background: "var(--ant-color-bg-container)",
            borderRadius: 4,
            padding: 16,
          }}
          vertical
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label={t`Description`}>
              <RichTextView value={action.description} />
            </Descriptions.Item>
            <Descriptions.Item label={t`Chemin`}>
              {action.path ?? "—"}
            </Descriptions.Item>
          </Descriptions>
        </Flex>
      ),
    };
  });

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Actions`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          type="primary"
        >
          {t`Créer une action`}
        </Button>
      </Flex>

      {actionsQuery.isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : null}

      {!actionsQuery.isLoading && actions.length === 0 ? (
        <Empty description={t`Aucune action`} />
      ) : null}

      {actions.length > 0 ? (
        <Collapse
          bordered={false}
          items={items}
          style={{ background: "transparent" }}
        />
      ) : null}

      <ActionFormModal
        accountId={accountId}
        action={editing}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
        serviceId={serviceId}
      />

      <ActionCommentsDrawer
        accountId={accountId}
        action={commented}
        onClose={() => setCommented(undefined)}
        serviceId={serviceId}
      />
    </Flex>
  );
}
