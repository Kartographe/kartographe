// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Divider, Drawer, Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { ComponentTablesPanel } from "@/features/applications/components/component-tables-panel";
import { CommentsFeed } from "@/features/comments/comments-feed";
import { ComplexityPanel } from "@/features/complexity/complexity-panel";
import { invalidateEntityQueries } from "@/features/entities/invalidate-entity";
import { VotesPanel } from "@/features/votes/votes-panel";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";

type Component = components["schemas"]["ApplicationComponentItem"];

const COMMENTS_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/comments";

interface ComponentActivityDrawerProps {
  accountId: string;
  applicationId: string;
  /** The drawer is open exactly when a component is passed. */
  component: Component | undefined;
  onClose: () => void;
}

/**
 * Everything that hangs off a component — the database tables it works with,
 * votes, complexity estimates and the comment thread — in one drawer, since a
 * component has no page of its own.
 */
export function ComponentActivityDrawer({
  accountId,
  applicationId,
  component,
  onClose,
}: ComponentActivityDrawerProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const path = {
    account_id: accountId,
    application_id: applicationId,
    component_id: component?.id ?? "",
  };

  const commentsQuery = $api.useQuery(
    "get",
    COMMENTS_PATH,
    { params: { path } },
    { enabled: !!component }
  );
  const createMutation = $api.useMutation("post", COMMENTS_PATH, {
    meta: { successMessage: t`Commentaire publié` },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["get", COMMENTS_PATH] });
    invalidateEntityQueries(queryClient, "application_component");
  }

  async function publish(value: RichTextDocument) {
    await createMutation.mutateAsync({ params: { path }, body: { value } });
    invalidate();
  }

  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={!!component}
      title={component ? component.title : t`Composant`}
      width={560}
    >
      {component ? (
        <Flex gap={16} vertical>
          <ComponentTablesPanel
            accountId={accountId}
            applicationId={applicationId}
            componentId={component.id}
            readOnly={component.locked}
          />
          <Divider style={{ margin: 0 }} />
          <VotesPanel
            accountId={accountId}
            entityId={component.id}
            entityType="application_component"
          />
          <Divider style={{ margin: 0 }} />
          <ComplexityPanel
            accountId={accountId}
            entityId={component.id}
            entityType="application_component"
          />
          <Divider style={{ margin: 0 }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t`Commentaires`}
          </Typography.Title>
          <CommentsFeed
            accountId={accountId}
            comments={commentsQuery.data?.items ?? []}
            isLoading={commentsQuery.isLoading}
            isPublishing={createMutation.isPending}
            onChanged={invalidate}
            onPublish={publish}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
