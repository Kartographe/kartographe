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
  Tag,
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
import { ApplicationStatusTag } from "@/features/applications/application-tags";
import { RouteCommentsDrawer } from "@/features/applications/routes/route-comments-drawer";
import { RouteFormModal } from "@/features/applications/routes/route-form-modal";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type ApplicationRoute = components["schemas"]["ApplicationRouteItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/routes",
];

export function RoutesScreen({
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
  const [editing, setEditing] = useState<ApplicationRoute | undefined>(
    undefined
  );
  const [commented, setCommented] = useState<ApplicationRoute | undefined>(
    undefined
  );

  const path = { account_id: accountId, application_id: applicationId };

  const routesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/routes",
    { params: { path } }
  );
  const guardsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/guards",
    { params: { path } }
  );
  const rolesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/roles",
    { params: { path } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}",
    { meta: { successMessage: t`Route supprimée` } }
  );

  const routes = routesQuery.data?.items ?? [];
  const guardTitles = new Map(
    (guardsQuery.data?.items ?? []).map((guard) => [guard.id, guard.title])
  );
  const roleTitles = new Map(
    (rolesQuery.data?.items ?? []).map((role) => [role.id, role.title])
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function changeStatus(
    route: ApplicationRoute,
    status: ApplicationRoute["status"]
  ) {
    await statusMutation.mutateAsync({
      params: { path: { ...path, route_id: route.id } },
      body: { status },
    });
    invalidate();
  }

  function confirmDelete(route: ApplicationRoute) {
    modal.confirm({
      title: t`Supprimer ${route.method} ${route.path} ?`,
      content: t`Les réponses, exemples et tables associés seront perdus.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, route_id: route.id } },
        });
        invalidate();
      },
    });
  }

  const items = routes.map((route) => {
    const color = HTTP_METHOD_COLORS[route.method];
    // Dimming tracks "archived" — a draft is neither dimmed nor active.
    const archived = route.status === "archived";
    return {
      key: route.id,
      style: {
        background: tintMethod(color),
        border: `1px solid ${color}`,
        borderRadius: 4,
        marginBottom: 8,
        opacity: archived ? 0.6 : 1,
      },
      label: (
        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
          <MethodTag method={route.method} />
          <RoutePath path={route.path} />
          <Typography.Text ellipsis style={{ flex: 1 }} type="secondary">
            {route.title ?? ""}
          </Typography.Text>
          <ApplicationStatusTag
            loading={statusMutation.isPending}
            onChange={(next) => changeStatus(route, next)}
            status={route.status}
          />
        </Flex>
      ),
      extra: (
        <Flex gap={4} onClick={(event) => event.stopPropagation()}>
          <Tooltip title={t`Commentaires`}>
            <Button
              icon={<CommentOutlined />}
              onClick={() => setCommented(route)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Modifier`}>
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(route);
                setFormOpen(true);
              }}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(route)}
              size="small"
            />
          </Tooltip>
        </Flex>
      ),
      children: (
        <Flex
          gap={16}
          style={{
            background: "var(--ant-color-bg-container)",
            borderRadius: 4,
            padding: 16,
          }}
          vertical
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label={t`Description`}>
              <RichTextView value={route.description} />
            </Descriptions.Item>
            <Descriptions.Item label={t`Guards`}>
              {route.applicationGuardIds.length ? (
                <Flex gap={4} wrap>
                  {route.applicationGuardIds.map((id) => (
                    <Tag key={id}>{guardTitles.get(id) ?? id}</Tag>
                  ))}
                </Flex>
              ) : (
                t`Aucun`
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t`Rôles`}>
              {route.applicationRoleIds.length ? (
                <Flex gap={4} wrap>
                  {route.applicationRoleIds.map((id) => (
                    <Tag key={id}>{roleTitles.get(id) ?? id}</Tag>
                  ))}
                </Flex>
              ) : (
                t`Aucun`
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t`Formats acceptés`}>
              {route.acceptedFormat.length
                ? route.acceptedFormat.join(", ")
                : "—"}
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
          {t`Routes`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          type="primary"
        >
          {t`Créer une route`}
        </Button>
      </Flex>

      {routesQuery.isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : null}

      {!routesQuery.isLoading && routes.length === 0 ? (
        <Empty description={t`Aucune route`} />
      ) : null}

      {routes.length > 0 ? (
        <Collapse
          bordered={false}
          items={items}
          style={{ background: "transparent" }}
        />
      ) : null}

      <RouteFormModal
        accountId={accountId}
        applicationId={applicationId}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
        route={editing}
      />

      <RouteCommentsDrawer
        accountId={accountId}
        applicationId={applicationId}
        onClose={() => setCommented(undefined)}
        route={commented}
      />
    </Flex>
  );
}
